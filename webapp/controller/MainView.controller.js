sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/util/File",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/m/Dialog", // ダイアログ表示用
    "sap/m/ProgressIndicator", // 進行状況用
    "sap/m/MessageStrip", // MessageStrip の読み込み
    "sap/m/VBox"
], (Controller, uFile, BusyIndicator, MessageToast, Dialog, ProgressIndicator, MessageStrip, VBox) => {
    "use strict";
    var mimeType;
    var fileExtension;
    var fileContent_row;
    var uploadedFileName;

    return Controller.extend("jeuplfromiflow.journalentryuploadfromiflow.controller.MainView", {
        fileContent: [], // アップロードされたExcelデータ
        apiResults: [], // APIから取得する全レスポンスデータ
        onInit() {
        },
        onFileChange: function (oEvent) {
            // ファイルを取得
            var file = oEvent.getParameter("files")[0];
            if (!file) {
                return;
            }
            uploadedFileName = file.name; // ファイル名を保持
            const reader = new FileReader();

            // 日付項目として定義されたカラム（i18nキー）
            const dateColumnsKeys = ["Column6", "Column7", "Column8", "Column18", "Column50"];

            // i18nから日付項目の実際の名前を取得
            const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const dateColumnsNames = dateColumnsKeys.map((key) => resourceBundle.getText(key));

            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" }); // SheetJSでExcel読み込み
                const sheetName = workbook.SheetNames[0]; // 最初のシートを選択
                const sheet = workbook.Sheets[sheetName];

                // ExcelデータをJSON形式に変換（raw: false）
                const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "yyyy/MM/dd" });

                // 日付項目を変換（「MM/DD/YYYY」 → 「yyyy/MM/dd」）
                const formattedData = rawData.map((row) => {
                    let formattedRow = {};
                    Object.keys(row).forEach((key) => {
                        const value = row[key];
                        // 日付項目の場合は「yyyy/MM/dd」形式に再フォーマット
                        if (dateColumnsNames.includes(key) && typeof value === "string" && !isNaN(Date.parse(value))) {
                            const date = new Date(value);
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                            const dd = String(date.getDate()).padStart(2, "0");
                            formattedRow[key] = `${yyyy}/${mm}/${dd}`;
                        } else {
                            formattedRow[key] = value; // その他の値はそのままコピー
                        }
                    });
                    return formattedRow;
                });

                // ヘッダ行のキーを "Column1", "Column2", ... に置き換え
                this.fileContent = formattedData.map((row) => {
                    let newRow = {};
                    Object.keys(row).forEach((key, index) => {
                        newRow[`Column${index + 1}`] = row[key];
                    });
                    return newRow;
                });

                MessageToast.show(resourceBundle.getText("uploadFileConfirmMessage") +
                    "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")");
            };
            reader.readAsArrayBuffer(file);
        },
        onUploadPress: async function (oEvent) {
            const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            if (this.fileContent.length === 0) {
                MessageToast.show(resourceBundle.getText("NotUploadFileMessage"));
                return;
            }

            // データ分割（伝票番号をキーとして100件ごとに分割）
            const chunkSize = 100;
            const endpoint = "https://apitiralhost.test.apimanagement.us10.hana.ondemand.com:443/call_journalentrypost_sync2";
            const batches = this._splitDataIntoChunks(this.fileContent, chunkSize, "Column4");

            // 進行状況インジケーターの作成
            const oProgressIndicator = new ProgressIndicator({
                state: "None",
                percentValue: 0,
                displayValue: resourceBundle.getText("ProcessIndicatorMessage"),
                width: "auto" // ProgressIndicatorの横幅は自動調整
            });

            // Dialogの作成
            const oDialog = new Dialog({
                title: resourceBundle.getText("ProcessIndicatorTitle"),
                content: oProgressIndicator, // ProgressIndicatorを直接ダイアログに追加
                width: "50%", // Dialogの横幅設定
                beginButton: new sap.m.Button({
                    text: "キャンセル",
                    press: function () {
                        oDialog.close();
                    }
                })
            });

            // ダイアログを開いて進行状況を表示
            oDialog.open();

            // 処理進行状況をトラック
            let completed = 0;
            const total = batches.length;

            try {
                for (const [index, batch] of batches.entries()) {
                    const response = await this._postData(endpoint, batch); // API呼び出し
                    // レスポンスを全体の結果にマージ
                    this.apiResults = this.apiResults.concat(response);
                    // 進捗更新
                    completed++;
                    const percent = Math.round((completed / total) * 100);
                    oProgressIndicator.setPercentValue(percent); // 進行状況を更新
                }

                if (completed === total) {
                    const messageStrip = new MessageStrip({
                        text: resourceBundle.getText("uploadFileConfirmMessage") +
                            "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")",
                        showCloseButton: true,
                        showIcon: true,
                        type: "Success"
                    });
                    this.getView().byId("panel0").addContent(messageStrip);
                }

                // レスポンスデータをマッピングし、Excelファイルとして出力
                const mappedData = this._mapApiResults(this.fileContent, this.apiResults);
                this._generateAndDownloadExcel(mappedData);

            } catch (err) {
                const messageStrip = new MessageStrip({
                    text: resourceBundle.getText("ProcessErrorMessage") + ": ${err.message}" +
                        "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")",
                    showCloseButton: true,
                    showIcon: true,
                    type: "Error"
                });
                this.getView().byId("panel0").addContent(messageStrip);
            }

            // 処理が完了したらダイアログを閉じる
            oDialog.close();
            this.apiResults = [];
            //     const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            //     if (this.fileContent.length === 0) {
            //         MessageToast.show(resourceBundle.getText("NotUploadFileMessage"));
            //         return;
            //     }
            //     // BusyIndicator.show(0);
            //     //*************************************************************
            //     // データ分割（伝票番号をキーとして100件ごとに分割）
            //     const chunkSize = 100;
            //     const endpoint = "https://apitiralhost.test.apimanagement.us10.hana.ondemand.com:443/call_journalentrypost_sync2";
            //     const batches = this._splitDataIntoChunks(this.fileContent, chunkSize, "Column4");

            //     // 進行状況インジケーターの表示（ダイアログでラッピング）
            //     const oProgressIndicator = new ProgressIndicator({
            //         state: "None",
            //         percentValue: 0,
            //         displayValue: resourceBundle.getText("ProcessIndicatorMessage")
            //     });
            //     const oDialog = new Dialog({
            //         title: resourceBundle.getText("ProcessIndicatorTitle"),
            //         content: oProgressIndicator
            //         // beginButton: new sap.m.Button({
            //         //     text: "キャンセル",
            //         //     press: function () {
            //         //         oDialog.close();
            //         //     }
            //         // })
            //     });
            //     oDialog.open();  // ダイアログを開いて進行状況を表示

            //     // 処理進行状況をトラック
            //     let completed = 0;
            //     const total = batches.length;

            //     // すべてのバッチを逐次POSTリクエスト
            //     const results = [];
            //     try {
            //         for (const [index, batch] of batches.entries()) {
            //             const response = await this._postData(endpoint, batch); // API呼び出し
            //             // レスポンスを全体の結果にマージ
            //             this.apiResults = this.apiResults.concat(response);
            //             // 進捗更新
            //             completed++;
            //             const percent = Math.round((completed / total) * 100);
            //             oProgressIndicator.setPercentValue(percent)
            //         }

            //         if (completed === total) {
            //             // sap.m.MessageToast.show(resourceBundle.getText("ProcessCompletedMessage"));
            //             const messageStrip = new MessageStrip({
            //                 text: resourceBundle.getText("uploadFileConfirmMessage") +
            //                     "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")",
            //                 showCloseButton: true,
            //                 showIcon: true,
            //                 type: "Success"
            //             });
            //             this.getView().byId("panel0").addContent(messageStrip);
            //         }

            //         // レスポンスデータをマッピングし、Excelファイルとして出力
            //         const mappedData = this._mapApiResults(this.fileContent, this.apiResults);
            //         this._generateAndDownloadExcel(mappedData);

            //         // results.push({ index, success: true, response });
            //     } catch (err) {
            //         // MessageToast.show(resourceBundle.getText("ProcessErrorMessage"), ": ${err.message}");
            //         // results.push({ index, success: false, error });
            //         const messageStrip = new MessageStrip({
            //             text: resourceBundle.getText("ProcessErrorMessage") + ": ${err.message}" +
            //                 "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")",
            //             showCloseButton: true,
            //             showIcon: true,
            //             type: "Error"
            //         });
            //         this.getView().byId("panel0").addContent(messageStrip);
            //     }

            //     // 処理が完了したらダイアログを閉じる
            //     oDialog.close();
            //     this.apiResults = [];
        },
        onTempDownload: async function () {
            BusyIndicator.show(0);

            // i18nモデルを取得
            const i18nModel = this.getView().getModel("i18n");
            const getLocalizedText = (key) => i18nModel.getResourceBundle().getText(key);

            // ヘッダに対応するi18nキー一覧
            const headerKeys = [
                "Column1",
                "Column2",
                "Column3",
                "Column4",
                "Column5",
                "Column6",
                "Column7",
                "Column8",
                "Column9",
                "Column10",
                "Column11",
                "Column12",
                "Column13",
                "Column14",
                "Column15",
                "Column16",
                "Column17",
                "Column18",
                "Column19",
                "Column20",
                "Column21",
                "Column22",
                "Column23",
                "Column24",
                "Column25",
                "Column26",
                "Column27",
                "Column28",
                "Column29",
                "Column30",
                "Column31",
                "Column32",
                "Column33",
                "Column34",
                "Column35",
                "Column36",
                "Column37",
                "Column38",
                "Column39",
                "Column40",
                "Column41",
                "Column42",
                "Column43",
                "Column44",
                "Column45",
                "Column46",
                "Column47",
                "Column48",
                "Column49",
                "Column50",
                "Column51",
                "Column52",
                "Column53",
                "Column54",
                "Column55",
                "Column56",
                "Column57",
                "Column58",
                "Column59",
                "Column60",
                "Column61",
                "Column62",
                "Column63",
                "Column64",
                "Column65",
                "Column66",
                "Column67",
                "Column68",
                "Column69",
                "Column70",
                "Column71",
                "Column72",
                "Column73",
                "Column74"
            ];

            // ヘッダ名のローカライズ処理
            const localizedHeaders = headerKeys.map((key) => ({
                header: getLocalizedText(key)
            }));

            // Excel作成処理
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Sheet1");
            worksheet.columns = localizedHeaders;

            // Excel書き込み
            const uint8Array = await workbook.xlsx.writeBuffer();
            const blob = new Blob([uint8Array], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);

            // ダウンロードリンクの生成
            const a = document.createElement("a");
            a.href = url;
            a.download = `JournalEntryTemplate.xlsx`;
            a.click();
            a.remove();
            BusyIndicator.hide();
        },

        convertBase64(urlSafeBase64) {
            var standardBase64 = urlSafeBase64.replace(/_/g, '/').replace(/-/g, '+');
            return standardBase64;
        },
        /**
        * データを指定サイズで分割するヘルパーメソッド
        * @param {Array} data 元データ（JSON形式）
        * @param {number} size 1バッチの最大件数
        * @param {string} key 伝票番号のキー
        * @returns {Array} 分割されたバッチ配列
        */
        _splitDataIntoChunks: function (data, size, key) {
            const groupedData = {};
            const result = [];

            // データを伝票番号でグループ化
            data.forEach((row) => {
                const docNumber = row[key]; // 伝票番号をキーに取得
                if (!groupedData[docNumber]) {
                    groupedData[docNumber] = [];
                }
                groupedData[docNumber].push(row);
            });

            // グループごとにサイズに応じて分割
            let currentBatch = [];
            for (const docNumber in groupedData) {
                const rows = groupedData[docNumber];
                if (currentBatch.length + rows.length > size) {
                    result.push(currentBatch);
                    currentBatch = [];
                }
                currentBatch.push(...rows);
            }

            if (currentBatch.length > 0) {
                result.push(currentBatch);
            }

            return result;
        },
        /**
             * データをAPIエンドポイントへPOST送信する
             * @param {string} endpoint エンドポイントURL
             * @param {Array} data バッチデータ
             * @returns {Promise} レスポンス結果
             */
        _postData: function (endpoint, data) {
            return fetch(endpoint, {
                method: "POST",
                headers: {
                    // "Content-Type": "application/json",
                    // Authorization: "Bearer <your_oauth_token>", // 必要に応じてアクセストークンを設定
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'responseType': "blob"
                },
                body: JSON.stringify(data),
            }).then((response) => {
                if (!response.ok) {
                    return response.json().then((err) => {
                        throw new Error(`Error: ${response.status}, ${JSON.stringify(err)}`);
                    });
                }
                return response.json();
            });
        },
        _mapApiResults: function (fileContent, apiResults) {
            const i18nModel = this.getView().getModel("i18n");
            const getLocalizedText = key => i18nModel.getResourceBundle().getText(key);

            // i18n 用ヘッダキー
            const headerKeys = {
                Column1: "Column1",
                Column2: "Column2",
                Column3: "Column3",
                Column4: "Column4",
                Column5: "Column5",
                Column6: "Column6",
                Column7: "Column7",
                Column8: "Column8",
                Column9: "Column9",
                Column10: "Column10",
                Column11: "Column11",
                Column12: "Column12",
                Column13: "Column13",
                Column14: "Column14",
                Column15: "Column15",
                Column16: "Column16",
                Column17: "Column17",
                Column18: "Column18",
                Column19: "Column19",
                Column20: "Column20",
                Column21: "Column21",
                Column22: "Column22",
                Column23: "Column23",
                Column24: "Column24",
                Column25: "Column25",
                Column26: "Column26",
                Column27: "Column27",
                Column28: "Column28",
                Column29: "Column29",
                Column30: "Column30",
                Column31: "Column31",
                Column32: "Column32",
                Column33: "Column33",
                Column34: "Column34",
                Column35: "Column35",
                Column36: "Column36",
                Column37: "Column37",
                Column38: "Column38",
                Column39: "Column39",
                Column40: "Column40",
                Column41: "Column41",
                Column42: "Column42",
                Column43: "Column43",
                Column44: "Column44",
                Column45: "Column45",
                Column46: "Column46",
                Column47: "Column47",
                Column48: "Column48",
                Column49: "Column49",
                Column50: "Column50",
                Column51: "Column51",
                Column52: "Column52",
                Column53: "Column53",
                Column54: "Column54",
                Column55: "Column55",
                Column56: "Column56",
                Column57: "Column57",
                Column58: "Column58",
                Column59: "Column59",
                Column60: "Column60",
                Column61: "Column61",
                Column62: "Column62",
                Column63: "Column63",
                Column64: "Column64",
                Column65: "Column65",
                Column66: "Column66",
                Column67: "Column67",
                Column68: "Column68",
                Column69: "Column69",
                Column70: "Column70",
                Column71: "Column71",
                Column72: "Column72",
                Column73: "Column73",
                Column74: "Column74",
                Column75: "Column75",
                Column76: "Column76"
            };
            const mappedData = fileContent.map(row => {
                // `Column4`（Excelデータのキー）を用いてAPIレスポンス内のデータを検索
                // const matchingApiResponse = apiResults[0].JournalEntryCreateConfirmation.find(response => response.MessageHeader.ReferenceID === row["Column4"]);
                const matchingApiResponse = apiResults
                    .flatMap(apiResult => apiResult.JournalEntryCreateConfirmation || []) // 各レスポンスから `JournalEntryCreateConfirmation` を収集
                    .find(response => response.MessageHeader.ReferenceID === row["Column4"]); // マッチするデータを検索

                if (matchingApiResponse) {
                    // `Item.Note` を結合して `Log Message` を作成
                    const logMessages = matchingApiResponse.Log.Item instanceof Array
                        ? matchingApiResponse.Log.Item.map(item => item.Note).join("\n")
                        : matchingApiResponse.Log.Item.Note;

                    // `MaximumLogItemSeverityCode` を `Log Result` として設定
                    const logResult = matchingApiResponse.Log.MaximumLogItemSeverityCode === "1" ? "OK" : "NG";

                    // 結果を元の行データに追加
                    return {
                        ...row,
                        "Column75": logMessages,
                        "Column76": logResult
                    };
                }

                // マッチしない場合は、デフォルト値を設定してそのまま返却
                return {
                    ...row,
                    "Column75": "No messages",
                    "Column76": "No result"
                };
            });
            // ヘッダ名を i18n を使って変換
            const localizedHeaders = Object.keys(mappedData[0]).reduce((result, key) => {
                const localizedKey = getLocalizedText(headerKeys[key] || key); // マッピングがなければ元のキーを使用
                result[localizedKey] = key;
                return result;
            }, {});

            // ヘッダ変換後のデータ作成
            const localizedData = mappedData.map(row =>
                Object.keys(localizedHeaders).reduce((newRow, localizedKey) => {
                    const originalKey = localizedHeaders[localizedKey];
                    newRow[localizedKey] = row[originalKey];
                    return newRow;
                }, {})
            );
            return localizedData;
        },
        _generateAndDownloadExcel: function (data) {
            //************************************************************************************************* */
            // const now = new Date();
            // const timestamp = now.getFullYear().toString() +
            //     (now.getMonth() + 1).toString().padStart(2, "0") +
            //     now.getDate().toString().padStart(2, "0") +
            //     now.getHours().toString().padStart(2, "0") +
            //     now.getMinutes().toString().padStart(2, "0") +
            //     now.getSeconds().toString().padStart(2, "0");

            // // ファイル名にタイムスタンプを組み込み
            // const fileName = `Result_${timestamp}`;

            // // i18nリソースバンドルから項目名を取得
            // const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            // const logMessageHeader = resourceBundle.getText("Column75"); // "LogMessage" のキーから取得

            // // 配列データをワークシート形式に変換
            // const worksheet = XLSX.utils.json_to_sheet(data);

            // // セルのフォーマット設定（特定の列のみ）
            // const keys = Object.keys(data[0]);
            // const logMessageIndex = keys.indexOf(logMessageHeader) + 1; // LogMessageヘッダ名のインデックス

            // if (logMessageIndex > 0) {
            //     const range = XLSX.utils.decode_range(worksheet["!ref"]);
            //     for (let rowIdx = range.s.r + 1; rowIdx <= range.e.r; rowIdx++) {
            //         const cellAddress = XLSX.utils.encode_cell({ c: logMessageIndex - 1, r: rowIdx });
            //         if (worksheet[cellAddress]) {
            //             worksheet[cellAddress].s = {
            //                 alignment: { wrapText: true }, // セル内で改行を有効にする設定
            //             };
            //         }
            //     }
            // }

            // // ワークブックにワークシートを追加
            // const workbook = XLSX.utils.book_new();
            // XLSX.utils.book_append_sheet(workbook, worksheet, "Result");

            // // Excelファイルをバイナリデータとして生成
            // const binaryData = XLSX.write(workbook, {
            //     bookType: "xlsx",
            //     type: "binary",
            //     cellStyles: true // セルスタイルを適用するためのオプション
            // });

            // // バイナリデータをBlob形式に変換
            // const blobData = new Blob(
            //     [this._stringToArrayBuffer(binaryData)],
            //     { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } // MIMEタイプを正確に指定
            // );

            // // sap.ui.core.util.Fileでダウンロード (拡張子を明示的に指定)
            // sap.ui.core.util.File.save(blobData, fileName, "xlsx");
            //*****************************************************************************
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, "0") +
                now.getDate().toString().padStart(2, "0") +
                now.getHours().toString().padStart(2, "0") +
                now.getMinutes().toString().padStart(2, "0") +
                now.getSeconds().toString().padStart(2, "0");

            // ファイル名にタイムスタンプを組み込み
            const fileName = `Result_${timestamp}`;

            // i18nリソースバンドルから項目名を取得
            const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const logMessageHeader = resourceBundle.getText("Column75"); // "LogMessage" のキーから取得

            // 配列データをワークシート形式に変換
            const worksheet = XLSX.utils.json_to_sheet(data);

            // 折り返しスタイルを特定の列に適用
            const logMessageColumn = Object.keys(data[0]).indexOf(logMessageHeader);
            if (logMessageColumn >= 0) {
                if (!worksheet["!cols"]) worksheet["!cols"] = [];
                worksheet["!cols"][logMessageColumn] = {
                    width: 75, // 幅を調整（任意の値）
                    // alignment: { wrapText: true } // 折り返して全体表示を有効にする->有料版のみのため不可能
                };
            }

            // ワークブックにワークシートを追加
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Result");

            // Excelファイルをバイナリデータとして生成
            const binaryData = XLSX.write(workbook, {
                bookType: "xlsx",
                type: "binary",
                cellStyles: true // セルスタイルを適用するためのオプション
            });

            // バイナリデータをBlob形式に変換
            const blobData = new Blob(
                [this._stringToArrayBuffer(binaryData)],
                { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } // MIMEタイプを正確に指定
            );

            // sap.ui.core.util.Fileでダウンロード (拡張子を明示的に指定)
            sap.ui.core.util.File.save(blobData, fileName, "xlsx");

            // MessageToast.show(resourceBundle.getText("OutputResultFileMessage"));
            const messageStrip = new MessageStrip({
                text: resourceBundle.getText("OutputResultFileMessage") +
                    "(" + resourceBundle.getText("UploadFileNameMessage") + uploadedFileName + ")",
                showCloseButton: true,
                showIcon: true,
                type: "Success"
            });
            this.getView().byId("panel0").addContent(messageStrip);

        },

        _stringToArrayBuffer: function (binaryString) {
            const buffer = new ArrayBuffer(binaryString.length);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < binaryString.length; i++) {
                view[i] = binaryString.charCodeAt(i);
            }
            return buffer;
        }
    });
});