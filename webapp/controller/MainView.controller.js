sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/core/util/File',
    'sap/ui/core/BusyIndicator'
], (Controller, uFile, BusyIndicator) => {
    "use strict";
    var fileContent;
    var fileName;
    var fileType;
    var mimeType;
    var fileExtension;
    var fileContent_row;

    return Controller.extend("jeuplfromiflow.journalentryuploadfromiflow.controller.MainView", {
        onInit() {
        },
        onFileChange: function (oEvent) {
            // Read file
            var file = oEvent.getParameter("files")[0];
            if (file === undefined) {
                return;
            }
            fileType = file.type;  //mimetype or file type
            fileName = file.name;
            //Instantiate JavaScript FileReader API
            var fileReader = new FileReader();
            //Read file content using JavaScript FileReader API


            var readFile = function onReadFile(file) {
                return new Promise(function (resolve) {
                    fileReader.onload = function (loadEvent) {
                        // fileContent_row = loadEvent.target.result;
                        resolve(loadEvent.target.result.match(/,(.*)$/)[1]);
                        fileContent = loadEvent.target.result.match(/,(.*)$/)[1];
                    };
                    fileReader.readAsDataURL(file);
                });
            };
            readFile(file), {
                busy: { set: true }
            };
        },
        onUploadPress: async function (oEvent) {
            // const Http = new XMLHttpRequest();
            // const url = "https://" + host + "/632_JournalEntrySalary";
            // Http.open("GET", url);
            // Http.send();
            BusyIndicator.show(0);
            var filename = "excelfile";
            var method = "POST";
            var obj = {
                fname: filename,
                format: "xlsx"
            };
            var headers = {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                'responseType': "blob"
            };
            var body = fileContent;
            var params = { content: fileContent };
            // var query_params = new URLSearchParams(params); 
            // fetch("https://development-tcyegvif.it-cpi019-rt.cfapps.us10-002.hana.ondemand.com/http/call_journalentrypost_sync")
            // fetch("https://apitiralhost.test.apimanagement.us10.hana.ondemand.com:443/call_journalentrypost_sync",{ method, headers })
            // const response = await fetch("https://apitiralhost.test.apimanagement.us10.hana.ondemand.com:443/call_journalentrypost_sync2",{ 
            //     headers: headers,
            //     method: method,
            //     mode: 'no-cors',
            //     body: body
            //  })
            // .then((res) => res.blob())
            // .then(blob => {
            //     let anchor = document.createElement("a");
            //     anchor.href = window.URL.createObjectURL(blob);
            //     anchor.download = filename+".xlsx";
            //     anchor.click();})
            // .then(console.log)
            // .catch(console.error);
            // )
            const res = await fetch("https://apitiralhost.test.apimanagement.us10.hana.ondemand.com:443/call_journalentrypost_sync2", { headers, method, body });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            // const data = await res.blob();
            const data = await res.text();

            // var test = atob(data);
            // console.log(test);
            var aUint8Array = Uint8Array.from(atob(data), c => c.charCodeAt(0));
            var oblob = new Blob([aUint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            uFile.save(oblob, filename, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            BusyIndicator.hide();

            // var oblob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            // uFile.save(oblob, filename);

            // const url = URL.createObjectURL(blob);

            // let anchor = document.createElement("a");
            // anchor.href = window.URL.createObjectURL(data);
            // anchor.download = filename+".xlsx";
            // anchor.click();
        },
        onTempDownload: async function () {
            BusyIndicator.show(0);
            var rows = ["会社コード",
                "会計伝票タイプ",
                "元帳グループ",
                "参照ID",
                "ヘッダテキスト",
                "伝票日付",
                "転記日付",
                "換算日付",
                "換算レート",
                "明細番号",
                "GL勘定コード",
                "取引通貨額",
                "税額",
                "取引通貨",
                "取引タイプ",
                "税コード",
                "取引先コード",
                "起算日",
                "明細テキスト",
                "ソートキー",
                "原価センタ",
                "利益センタ",
                "WBS要素",
                "指図",
                "セグメント",
                "機能領域",
                "従業員番号",
                "取引銀行",
                "取引銀行口座",
                "参照キー1",
                "参照キー2",
                "参照キー3",
                "得意先(収益性分析)",
                "得意先グループ(収益性分析)",
                "顧客業界(収益性分析)",
                "顧客国(収益性分析)",
                "販売地域(収益性分析)",
                "販売済み品目(収益性分析)",
                "販売済み品目グループ(収益性分析)",
                "販売組織(収益性分析)",
                "流通チャネル(収益性分析)",
                "WBS要素(収益性分析)",
                "機能領域(収益性分析)",
                "受注(収益性分析)",
                "受注明細(収益性分析)",
                "プラント(収益性分析)",
                "原価センタ(収益性分析)",
                "利益センタ(収益性分析)",
                "得意先",
                "期日計算基準日",
                "現金割引期間 1",
                "現金割引率 1",
                "現金割引期間 2",
                "現金割引率 2",
                "支払条件",
                "支払方法",
                "支払保留",
                "中央銀行コード",
                "特殊仕訳コード",
                "仕入先",
                "パートナ銀行タイプ",
                "名称(ワンタイム)",
                "名称3(ワンタイム)",
                "市区町村(ワンタイム)",
                "銀行の国/地域(ワンタイム)",
                "口座番号(ワンタイム)",
                "預金種別(ワンタイム)",
                "銀行コード(ワンタイム)",
                "手数料負担Code(ワンタイム)",
                "言語キー(ワンタイム)",
                "源泉徴収税タイプ",
                "源泉徴収税コード",
                "源泉徴収税基準額",
                "源泉徴収税額"];
            // xlsx(Sheet)JSのロジック
            // const worksheet = XLSX.utils.json_to_sheet(rows);
            // const workbook = XLSX.utils.book_new();
            // XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
            // const wbout = XLSX.write(workbook, {bookType:"xlsx", type:"binary"});
            // saveAs(new Blob([this.s2ab(wbout)], {type:"application/octet-stream"}), "JournalentryTemplate.xlsx");
            // s2ab(s) {
            //     const buf = new ArrayBuffer(s.length);
            //     const view = new Uint8Array(buf);
            //     for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            //     return buf;
            // },

            const workbook = new ExcelJS.Workbook();
            workbook.addWorksheet('Sheet1');
            const worksheet = workbook.getWorksheet('Sheet1');
            worksheet.columns = [
                { header: "会社コード" },
                { header: "会計伝票タイプ" },
                { header: "元帳グループ" },
                { header: "参照ID" },
                { header: "ヘッダテキスト" },
                { header: "伝票日付" },
                { header: "転記日付" },
                { header: "換算日付" },
                { header: "換算レート" },
                { header: "明細番号" },
                { header: "GL勘定コード" },
                { header: "取引通貨額" },
                { header: "税額" },
                { header: "取引通貨" },
                { header: "取引タイプ" },
                { header: "税コード" },
                { header: "取引先コード" },
                { header: "起算日" },
                { header: "明細テキスト" },
                { header: "ソートキー" },
                { header: "原価センタ" },
                { header: "利益センタ" },
                { header: "WBS要素" },
                { header: "指図" },
                { header: "セグメント" },
                { header: "機能領域" },
                { header: "従業員番号" },
                { header: "取引銀行" },
                { header: "取引銀行口座" },
                { header: "参照キー1" },
                { header: "参照キー2" },
                { header: "参照キー3" },
                { header: "得意先(収益性分析)" },
                { header: "得意先グループ(収益性分析)" },
                { header: "顧客業界(収益性分析)" },
                { header: "顧客国(収益性分析)" },
                { header: "販売地域(収益性分析)" },
                { header: "販売済み品目(収益性分析)" },
                { header: "販売済み品目グループ(収益性分析)" },
                { header: "販売組織(収益性分析)" },
                { header: "流通チャネル(収益性分析)" },
                { header: "WBS要素(収益性分析)" },
                { header: "機能領域(収益性分析)" },
                { header: "受注(収益性分析)" },
                { header: "受注明細(収益性分析)" },
                { header: "プラント(収益性分析)" },
                { header: "原価センタ(収益性分析)" },
                { header: "利益センタ(収益性分析)" },
                { header: "得意先" },
                { header: "期日計算基準日" },
                { header: "現金割引期間 1" },
                { header: "現金割引率 1" },
                { header: "現金割引期間 2" },
                { header: "現金割引率 2" },
                { header: "支払条件" },
                { header: "支払方法" },
                { header: "支払保留" },
                { header: "中央銀行コード" },
                { header: "特殊仕訳コード" },
                { header: "仕入先" },
                { header: "パートナ銀行タイプ" },
                { header: "名称(ワンタイム)" },
                { header: "名称3(ワンタイム)" },
                { header: "市区町村(ワンタイム)" },
                { header: "銀行の国/地域(ワンタイム)" },
                { header: "口座番号(ワンタイム)" },
                { header: "預金種別(ワンタイム)" },
                { header: "銀行コード(ワンタイム)" },
                { header: "手数料負担Code(ワンタイム)" },
                { header: "言語キー(ワンタイム)" },
                { header: "源泉徴収税タイプ" },
                { header: "源泉徴収税コード" },
                { header: "源泉徴収税基準額" },
                { header: "源泉徴収税額" }
            ];
            const uint8Array = await workbook.xlsx.writeBuffer();
            const blob = new Blob([uint8Array], { type: 'application/octet-binary' })
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `JournalentryTemplate.xlsx`;
            a.click();
            a.remove();
            BusyIndicator.hide();
        },

        convertBase64(urlSafeBase64) {
            var standardBase64 = urlSafeBase64.replace(/_/g, '/').replace(/-/g, '+');
            return standardBase64;
        }
    });
});