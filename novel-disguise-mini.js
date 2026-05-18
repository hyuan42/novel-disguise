// ==UserScript==
// @name         小说页面伪装
// @namespace    https://github.com/NiaoBlush/novel-disguise
// @version      2.12.0-mini
// @description  适配起点/番茄/微信读书, 仅保留Excel伪装模式. 基于NiaoBlush的novel-disguise脚本(MIT)精简改造.
// @author       NiaoBlush (modified)
// @license      MIT
// @run-at       document-end
// @icon64       https://s21.ax1x.com/2024/08/06/pkxPf0S.png
// @match        https://www.qidian.com/chapter/*
// @match        https://fanqienovel.com/reader/*
// @match        https://weread.qq.com/web/reader/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://cdn.jsdelivr.net/gh/hyuan42/novel-disguise@2a17e23/novel-disguise-jquery.js
// @require      https://cdn.jsdelivr.net/gh/hyuan42/novel-disguise@2a17e23/novel-disguise-resource.js
// ==/UserScript==

(function () {
    'use strict';
    printLog("novel-disguise(mini) 开始初始化");

    typeof jQuery !== "undefined" ? printLog("jQuery 版本: " + jQuery.fn.jquery) : printLog("error", "jQuery 未载入！");
    const $ = jQuery.noConflict(true);

    typeof NovelDisguiseResource !== "undefined" ? printLog("资源已载入") : printLog("error", "资源未载入");

    const screenInfo = getScreenInfo();
    let disguised_header_img = null;
    let disguised_footer_img = null;
    let disguised_icon_img = null;
    let headerHeight = null;
    let footerHeight = null;
    let readerHeight = null;

    const link_text_color = "rgba(0,0,0,.7)";
    const link_bg_color = "#f6f6f6";
    const link_front_color = "rgba(0,0,0,.7)";

    const DICT = {
        MODE: {
            EXCEL: 'mode_excel',
            ORIGINAL: 'mode_original'
        },
        THEME: {
            OFFICE: 'theme_office',
            WPS: 'theme_wps'
        },
        RESOURCE_RESOLUTION: {
            AUTO: 'auto',
            FORCE_1K: '1k',
            FORCE_2K: '2k',
            FORCE_4K: '4k'
        }
    };

    const KEY_CONFIG = "KEY_CONFIG_MINI";

    function printLog(...args) {
        let level = 'info';
        if (typeof args[0] === 'string' && ['info', 'warn', 'error'].includes(args[0])) {
            level = args.shift();
        }
        let levelStyle = '';
        switch (level) {
            case 'info':
                levelStyle = 'color:#00BFFF;font-weight:bold;';
                break;
            case 'warn':
                levelStyle = 'color:#FFA500;font-weight:bold;';
                break;
            case 'error':
                levelStyle = 'color:#FF4500;font-weight:bold;';
                break;
            default:
                levelStyle = 'color:#000;';
        }
        const prefix = `%c🎭novel-disguise%c [${level.toUpperCase()}]`;
        console.log(
            prefix,
            'background:#222;color:#FFD700;font-weight:bold;padding:2px 4px;border-radius:4px;',
            'background:none;' + levelStyle,
            ...args
        );
    }

    function readConfig() {
        const defaultConfig = {
            mode: DICT.MODE.EXCEL,
            lastVisibleMode: DICT.MODE.EXCEL,
            theme: DICT.THEME.OFFICE,
            hideImage: true,
            resourceResolution: DICT.RESOURCE_RESOLUTION.AUTO,

            emptyCols: 20,
            enableExcelRandomPopulate: true,
            maxExcelRandomPopulateCol: 9,

            // 微信读书 canvas 缩放比例 (1 = 原始大小, 0.7 = 缩到 70%, 数字越小字越小)
            wereadCanvasScale: 0.8
        };
        const stored = GM_getValue(KEY_CONFIG, {});
        const config = Object.assign({}, defaultConfig, stored);
        // 强制使用Excel模式 (除非用户按E切到原始)
        if (config.mode !== DICT.MODE.ORIGINAL) {
            config.mode = DICT.MODE.EXCEL;
            config.lastVisibleMode = DICT.MODE.EXCEL;
        }
        printLog("config loaded", config);
        return config;
    }

    const config = readConfig();

    function writeConfig() {
        GM_setValue(KEY_CONFIG, config);
    }

    function applyMode(mode) {
        printLog(`准备切换到模式[${mode}]...`);
        config.mode = mode;
        writeConfig();
        location.reload();
    }

    function settings() {
        const $settings = $(`
            <form class="nd-settings-form">
                <div class="nd-settings-form-group">
                    <label for="settings-mode">主题: </label>
                    <select id="settings-theme" name="settings-theme">
                        <option value="${DICT.THEME.OFFICE}">Office</option>
                        <option value="${DICT.THEME.WPS}">Wps</option>
                    </select>
                </div>
                <div class="nd-settings-form-group">
                    <label>隐藏图片: </label>
                    <label style="width: 30%;"><input type="radio" name="settings-hide-image" value="true">是</label>
                    <label style="width: 30%;"><input type="radio" name="settings-hide-image" value="false">否</label>
                </div>
                <div class="nd-settings-form-group">
                    <label>资源分辨率: </label>
                    <label><input type="radio" name="settings-res-resolution" value="${DICT.RESOURCE_RESOLUTION.AUTO}">自动</label>
                    <label style="margin-left: 4px;"><input type="radio" name="settings-res-resolution" value="${DICT.RESOURCE_RESOLUTION.FORCE_1K}">1K</label>
                    <label style="margin-left: 4px;"><input type="radio" name="settings-res-resolution" value="${DICT.RESOURCE_RESOLUTION.FORCE_2K}">2K</label>
                    <label style="margin-left: 4px;"><input type="radio" name="settings-res-resolution" value="${DICT.RESOURCE_RESOLUTION.FORCE_4K}">4K</label>
                </div>
                <div class="nd-settings-form-group" style="margin-top: 20px;">
                    <div class="nd-settings-btn-wrapper">
                        <button type="submit">保存设置</button>
                    </div>
                </div>
            </form>
        `);

        $settings.find("select[name=settings-theme]").val(config.theme);
        $settings.find(`input[name=settings-hide-image][value='${String(config.hideImage)}']`).prop('checked', true);
        $settings.find(`input[name=settings-res-resolution][value='${config.resourceResolution}']`).prop('checked', true);

        const $modal = showModal($settings, {title: "设置"});

        $settings.on('submit', function (event) {
            event.preventDefault();
            const formDataObj = new FormData(this);
            config.theme = formDataObj.get('settings-theme');
            config.hideImage = formDataObj.get('settings-hide-image') === 'true';
            config.resourceResolution = formDataObj.get('settings-res-resolution');
            writeConfig();

            popMsg("设置已保存，刷新页面后生效");
            $modal.remove();
        });
    }

    function setResource() {
        function getActualHeight(originalHeight) {
            return originalHeight / screenInfo.devicePixelRatio;
        }

        printLog('screenInfo', screenInfo);

        function getHeaderResource(currentMode, currentTheme, physicalWidth) {
            const wThreshold2k = 2560;
            const wThreshold4k = 3840;

            let size;
            if (config.resourceResolution === DICT.RESOURCE_RESOLUTION.AUTO) {
                if (physicalWidth >= wThreshold4k) {
                    size = "4k";
                } else if (physicalWidth >= wThreshold2k) {
                    size = "2k";
                } else {
                    size = "1k";
                }
            } else {
                size = config.resourceResolution;
            }

            return NovelDisguiseResource.getDisguisedImage({
                app: config.mode,
                theme: config.theme,
                size: size,
                scheme: "light",
                part: "header"
            });
        }

        const src = getHeaderResource(config.mode, config.theme, screenInfo.physicalWidth);
        disguised_header_img = src.url || src.base64;
        headerHeight = getActualHeight(screenInfo.physicalWidth * src.height / src.width);

        const disguised_footer_resource = NovelDisguiseResource.getDisguisedImage({
            app: config.mode,
            theme: DICT.THEME.OFFICE,
            size: "1k",
            scheme: "light",
            part: "footer"
        });
        disguised_footer_img = disguised_footer_resource.base64;
        footerHeight = disguised_footer_resource.height;

        disguised_icon_img = NovelDisguiseResource.getDisguisedImage({
            app: config.mode,
            theme: DICT.THEME.OFFICE,
            size: "1k",
            scheme: "light",
            part: "icon"
        }).base64;

        readerHeight = window.innerHeight - headerHeight - footerHeight;
    }

    function hideImages({selector, replaceParent = false, indicatorText = '点击显示图片'}) {
        if (!config.hideImage) return;
        $(selector).each(function () {
            const imgSrc = $(this).attr('src');
            const span = $('<span class="disguised-img-indicator"></span>')
                .attr('data-src', imgSrc)
                .text(indicatorText);
            if (replaceParent) {
                $(this).parent().replaceWith(span);
            } else {
                $(this).replaceWith(span);
            }
        });
    }

    function registerImageIndicators() {
        $(".disguised-img-indicator").on('click', function () {
            const src = $(this).attr('data-src');
            const $newImg = $('<img>').attr('src', src);
            const $modal = showModal($newImg);
            $modal.find("img").css({"max-width": "80vw", "max-height": "80vh"});
            $newImg.on('click', function () {
                $modal.remove();
            });
        });
    }

    function common() {
        setResource();

        GM_addStyle(`
        .img-fill-in {
            background-repeat: no-repeat;
            background-size: 100% 100%;
        }

        html {
            overflow-y: hidden;
            color-scheme: normal !important;
        }

        #disguised-page {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        #disguised-header {
            width: 100%;
            aspect-ratio: ${screenInfo.screenWidth / headerHeight};
            background-image: url(${disguised_header_img});
        }

        #disguised-title {
            position: fixed;
            top: 5px;
            left: 0;
            width: 100%;
            z-index: 9999;
            text-align: center;
            color: ${config.theme === DICT.THEME.OFFICE ? '#edffff' : '#232323'};
            font-size: 12px;
            line-height: 22px;
            user-select: none;
        }

        #disguised-footer {
            height: ${footerHeight}px;
            line-height: ${footerHeight}px;
            width: 100%;
            background-image: url(${disguised_footer_img});
            font-size: 13px;
            color: #262626;
            box-sizing: border-box;
            position: relative;
        }

        #footer-content {
            position: absolute;
            left: 0;
            bottom: 0;
            height: ${footerHeight}px;
            line-height: ${footerHeight}px;
            width: 100%;
            flex-direction: row;
            flex-wrap: nowrap;
            align-content: center;
            justify-content: flex-start;
            align-items: center;
            box-sizing: border-box;
            padding-left: 20px;
        }

        #footer-content > * {
            height: 100%;
            line-height: 100%;
            margin-right: 10px;
            font-size: 13px;
        }

        #disguised-body {
            flex: 1;
            padding-left: 0;
            padding-right: 0;
            background-repeat: repeat-y;
            background-size: 100% auto;
            overflow-y: hidden;
            width: 100%;
            box-sizing: border-box;
        }

        #disguised-content {
            background-color: #FFF;
            border-left-color: #c6c6c6;
            border-right-color: #c6c6c6;
            border-left-width: 1px;
            border-right-width: 1px;
            min-height: 100%;
            width: 100%;
            box-sizing: border-box;
            height: 100%;
            overflow-x: hidden;
            overflow-y: scroll;
        }

        #disguised-content > * {
            width: 100%;
            margin: unset;
            box-sizing: border-box;
        }

        #disguised-content p {
            color: black;
        }

        #disguised-content div {
            background-color: #FFF !important;
        }

        .disguised-link, .disguised-img-indicator {
            color: ${link_text_color};
            text-decoration: underline;
            cursor: pointer;
            margin-right: 5px;
        }

        .disguised-modal-wrapper {
            position: fixed;
            z-index: 99999;
            top: 50%;
            left: 50%;
            max-height: 100%;
            max-width: 100%;
            transform: translate(-50%, -50%);
            border: 1px solid #707070;
            background-color: #F0F0F0;
        }

        .disguised-modal-header {
            background-color: #FFF;
            min-width: 200px;
            height: 32px;
            display: flex;
        }

        .disguised-modal-title {
            flex: 1;
            user-select: none;
            padding-left: 10px;
            color: black;
            display: flex;
            align-items: center;
        }

        .disguised-modal-header-close {
            position: relative;
            background-color: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            width: 36px;
            height: 32px;
            font-size: 1em;
        }
        .disguised-modal-header-close:hover { background-color: #E81023; }
        .disguised-modal-header-close::before,
        .disguised-modal-header-close::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 15px;
            height: 1px;
            background-color: black;
            transform-origin: center;
        }
        .disguised-modal-header-close:hover::before,
        .disguised-modal-header-close:hover::after { background-color: #FFF; }
        .disguised-modal-header-close::before { transform: translate(-50%, -50%) rotate(45deg); }
        .disguised-modal-header-close::after { transform: translate(-50%, -50%) rotate(-45deg); }

        .disguised-modal-body {
            padding: 10px;
            background-color: #F0F0F0;
            min-height: 32px;
            max-height: calc(100vh - 32px);
            font-size: 1em;
            line-height: normal;
            overflow-y: auto;
        }

        .disguised-modal-wrapper * { margin: unset; }

        .nd-settings-form {
            font-family: 'Microsoft YaHei', sans-serif;
            width: 300px;
            box-shadow: none;
        }
        .nd-settings-form-group:not(:last-child) { margin-bottom: 15px; }
        .nd-settings-form-group label {
            display: inline-block;
            font-size: 13px;
            color: #000;
            margin-bottom: 5px;
        }
        .nd-settings-form-group select,
        .nd-settings-form-group input[type="radio"] {
            font-size: 13px;
            padding: 2px;
            border: 1px solid #c0c0c0;
            background-color: white;
            width: auto;
        }
        .nd-settings-form-group input[type="radio"] {
            width: auto;
            margin-right: 5px;
        }
        .nd-settings-form-group button {
            font-size: 13px;
            padding: 5px 10px;
            margin-right: 5px;
            border: 1px solid #c0c0c0;
            border-radius: 2px;
            background-color: #e0e0e0;
            cursor: pointer;
        }
        .nd-settings-form-group button[type="submit"] { background-color: #dcdcdc; }
        .nd-settings-form-group button:hover { background-color: #c0c0c0; }
        .nd-settings-form-group button:active { background-color: #a0a0a0; }
        .nd-settings-form-group button:focus { outline: 1px solid #606060; }
        .nd-settings-form-group select { margin-right: 5px; width: 180px; }
        .nd-settings-form-group select:focus-visible { outline: none; }
        .nd-settings-form-group label:first-child { width: 100px; }
        .nd-settings-form p { margin-bottom: 10px; }
        .nd-settings-btn-wrapper { display: flex; justify-content: flex-end; }

        .nd_msg{display:none;position:fixed;top:10px;left:50%;transform:translateX(-50%);color:#fff;text-align:center;z-index:99996;padding:10px 30px;font-size:16px;border-radius:10px;background-size:25px;background-repeat:no-repeat;background-position:15px}
        .nd_msg a{color:#fff;text-decoration: underline;}
        .nd_msg-ok{background:#4bcc4b}
        .nd_msg-err{background:#c33}
        .nd_msg-warn{background:#FF9900}
        `);

        // 图标
        const link = $('<link rel="icon" type="image/x-icon">').attr('href', disguised_icon_img);
        $('link[rel*="icon"]').remove();
        $('head').append(link);

        $('body').children().hide();

        $(`<div id='disguised-page'>
                <div id='disguised-title'></div>
                <div id='disguised-header' class='img-fill-in'></div>
                <div id='disguised-body'>
                    <div id='disguised-content'></div>
                </div>
                <div id='disguised-footer' class='img-fill-in'>
                    <div id="footer-content">
                        <span>简体中文（中国大陆）</span><span>辅助功能：一切就绪</span>
                    </div>
                </div>
           </div>`).appendTo("body");

        overridePageTitle();

        GM_addStyle(`
        #footer-content {
            height: 45%;
            line-height: 45%;
        }

        table { margin: 0; }
        .excel-table,
        .excel-table th,
        .excel-table td,
        .excel-table thead,
        .excel-table tbody { border-spacing: 0; }
        .excel-table { border-collapse: collapse; }

        .excel-table > thead {
            background-color: ${config.theme === DICT.THEME.OFFICE ? '#E6E6E6' : '#EEEEEE'};
        }

        .excel-table > thead > tr > th {
            font-weight: normal;
            font-size: 14px;
            color: black !important;
            background-color: ${config.theme === DICT.THEME.OFFICE ? '#E6E6E6' : '#EEEEEE'};
            position: sticky;
            top: 0;
            outline: 1px solid;
            outline-color: #A0A0A0;
            text-align: center;
            font-family: "SimSun", sans-serif;
            padding: 0;
            line-height: normal;
            z-index: 9999;
        }

        .excel-table th { min-width: 71px; }
        .excel-table th:nth-child(1) { width: auto; min-width: 20px; }
        .excel-table th:nth-child(2) { min-width: 50vw; }

        .excel-table > tbody > tr > td:nth-child(1) {
            text-align: center;
            background-color: #E6E6E6;
            padding-left: 5px;
            padding-right: 5px;
            user-select: none;
        }
        .excel-table tbody td:not(:nth-child(1)):not(:nth-child(2)) {
            white-space: nowrap;
            text-align: center;
        }
        .excel-table > tbody > tr > td {
            border: 1px solid #DDDDDD;
            padding: 3px 10px;
            line-height: normal;
        }
        .excel-table > tbody > tr > td,
        .excel-table tbody td p {
            font-size: 12px;
            font-weight: normal;
            color: black !important;
            font-family: "Microsoft YaHei", "SimSun", sans-serif;
        }
        .excel-table > tbody > tr:first-child > td { border-top: none; }
        .excel-table tbody td > div {
            margin: 0;
            padding: 0;
            text-align: unset;
        }
        `);

        // 构建表格
        const $table = $('<table class="excel-table"></table>');
        const extraThead = (function () {
            let output = '';
            for (let i = 1; i <= config.emptyCols; i++) {
                const char = String.fromCharCode(64 + i);
                output += `<th>${char}</th>`;
            }
            return output;
        })();
        const $thead = $(`<thead><tr><th></th>${extraThead}</tr></thead>`);
        const $tbody = $('<tbody></tbody>');
        $table.append($thead);
        $table.append($tbody);
        $("#disguised-content").append($table);

        padExcelBlankLines();
    }

    function overridePageTitle() {
        document.title = "工作簿1";
    }

    function clearExcelContent() {
        $(".excel-table tbody").empty();
    }

    function getExcelLastIndex() {
        const $cell = $(".excel-table > tbody > tr:last-child > td:first-child");
        const indexCellText = $.trim($cell.text());
        return indexCellText ? parseInt(indexCellText) : 0;
    }

    function padExcelBlankLines(max = 50) {
        const lastIndex = getExcelLastIndex();
        const emptyLines = [];
        for (let i = lastIndex + 1; i <= max; i++) {
            emptyLines.push("​");
        }
        setExcelLines(emptyLines, true);
    }

    function setExcelLines(lines, append = false, rowHandler) {
        let lastIndex;
        if (append) {
            lastIndex = getExcelLastIndex();
        } else {
            clearExcelContent();
            lastIndex = 0;
        }
        const $tbody = $(".excel-table > tbody");
        lines.forEach(function (line, index) {
            if (typeof line === 'string') {
                line = line.replace(/&nbsp;/g, '').trim();
            }
            if (line === '') return;
            if (line instanceof $ && line.length === 0) return;

            const $td2 = $('<td></td>');
            if (typeof rowHandler === 'function') {
                line = rowHandler(line, index, $td2);
            }

            const $tr = $('<tr></tr>');
            const $td1 = $('<td></td>').text(++lastIndex);
            $td2.html(line);
            $tr.append($td1);
            $tr.append($td2);
            for (let i = 0; i < config.emptyCols; i++) {
                let tdContent = "";
                if (config.enableExcelRandomPopulate && i < config.maxExcelRandomPopulateCol) {
                    tdContent = generateRandomContent(i);
                }
                $tr.append($(`<td>${tdContent}</td>`));
            }
            $tbody.append($tr);
        });
    }

    function setExcelContent($contentEl, type = 'br', clone = false, rowHandler) {
        if (type === 'br') {
            const lines = $contentEl.html().split('<br>');
            setExcelLines(lines);
        } else if (type === 'p') {
            let pList;
            if (clone) {
                pList = $contentEl.children('p').clone().toArray();
            } else {
                pList = $contentEl.children('p').toArray();
            }
            pList = pList.filter(function (p) {
                return $(p).text().trim() !== '';
            });
            setExcelLines(pList);
        }
    }

    function addEmptyExcelLines(num = 1) {
        setExcelLines(new Array(num).fill("​"), true);
    }

    function addExcelStyle(styleText) {
        GM_addStyle(styleText);
    }

    function setDisguisedTitle(titleStr) {
        $('#disguised-title').text(titleStr);
    }

    function setDisguisedFooter(detail) {
        const $footerEl = $('#footer-content');
        $footerEl.text("");
        if (typeof detail === "string") {
            $footerEl.text(detail);
        } else {
            detail.appendTo($footerEl);
        }
    }

    function getScreenInfo() {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const physicalWidth = screenWidth * devicePixelRatio;
        return {screenWidth, screenHeight, devicePixelRatio, physicalWidth};
    }

    function generateRandomContent(type = 1) {
        type = (type % 9) + 1;

        function generateRandomLetters(n, isUpperCase) {
            const letters = isUpperCase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz';
            let result = '';
            for (let i = 0; i < n; i++) {
                result += letters.charAt(Math.floor(Math.random() * letters.length));
            }
            return result;
        }

        function getRandomInt(a, b) {
            return Math.floor(Math.random() * (b - a + 1)) + a;
        }

        function getRandomPaddedInt(n) {
            const max = Math.pow(10, n) - 1;
            const min = Math.pow(10, n - 1);
            const randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
            return randomInt.toString().padStart(n, '0');
        }

        function getRandomItem(list) {
            return list[Math.floor(Math.random() * list.length)];
        }

        function getRandomChineseName() {
            const surnames = ["赵", "钱", "孙", "李", "周", "刘", "王"];
            const commonGivenChars = [
                "伟", "秀", "敏", "静", "丽", "强", "磊", "军", "洋", "杰", "婷", "浩", "婷", "欣",
                "佳", "琪", "婧", "思", "鑫", "博", "宇", "轩", "涵", "宁", "瑶", "晨", "泽", "瑞"
            ];
            const surname = getRandomItem(surnames);
            const len = Math.random() < 0.5 ? 1 : 2;
            let given = "";
            for (let i = 0; i < len; i++) {
                given += getRandomItem(commonGivenChars);
            }
            return surname + given;
        }

        function getRandomDateUsingRandomNumbers() {
            const year = Math.floor(Math.random() * (2024 - 2020 + 1)) + 2020;
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function getYesNo() {
            return Math.random() < 0.5 ? '是' : '否';
        }

        // 低饱和度填充色 (Excel 单元格高亮的常用色)
        // 注意 inline !important: 用于覆盖 common() 里的 #disguised-content div{background:#FFF!important}
        function getFilledColorCell() {
            const palette = [
                '#FFF2CC', // 浅黄
                '#D9E1F2', // 浅蓝
                '#E2EFDA', // 浅绿
                '#FCE4D6', // 浅橙
                '#F4CCCC', // 浅红
                '#EDEDED'  // 浅灰
            ];
            // 30% 留白, 让整列不要太花
            if (Math.random() < 0.3) return '';
            const color = palette[Math.floor(Math.random() * palette.length)];
            return `<div style="background-color:${color} !important;margin:-3px -10px;padding:3px 10px;">&nbsp;</div>`;
        }

        // 千分位货币
        function getCurrency() {
            const value = (Math.random() * 100000).toFixed(2);
            const formatted = parseFloat(value).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            return `¥${formatted}`;
        }

        // 数据条 (Excel 的 in-cell bar chart)
        function getProgressBar() {
            const value = getRandomInt(5, 100);
            const barColor = value > 70 ? '#4a90d9' : value > 30 ? '#7fb069' : '#e08e45';
            return `<div style="position:relative;background-color:#f0f0f0 !important;margin:-3px -10px;padding:0;height:18px;line-height:18px;">
                <div style="background-color:${barColor} !important;height:100%;width:${value}%;opacity:0.7;"></div>
                <div style="position:absolute;top:0;left:0;width:100%;text-align:center;font-size:11px;color:#000;background-color:transparent !important;">${value}%</div>
            </div>`;
        }

        switch (type) {
            case 1:
                return `${generateRandomLetters(2, true)}-${generateRandomLetters(2, true)}-${generateRandomLetters(2, true)}${getRandomPaddedInt(6)}`;
            case 2:
                return getRandomChineseName();
            case 3:
                return getRandomDateUsingRandomNumbers();
            case 4:
                return getRandomInt(1, 9999);
            case 5:
                return generateRandomLetters(1, true);
            case 6:
                return getFilledColorCell();
            case 7:
                return getYesNo();
            case 8:
                return getCurrency();
            case 9:
                return getProgressBar();
        }
    }

    function showModal(content, modalConfig = {}) {
        const $modal = $(`
        <div class="disguised-modal-wrapper">
            <div class="disguised-modal-header">
                <div class="disguised-modal-title">${modalConfig.title || ""}</div>
            </div>
            <div class="disguised-modal-body"></div>
        </div>
        `);

        const $headerClose = $(`<div class="disguised-modal-header-close"></div>`);
        $headerClose.on("click", function () {
            $modal.remove();
        });
        $modal.find(".disguised-modal-header").append($headerClose);

        if (modalConfig.width && typeof modalConfig.width === "number") {
            $modal.css("width", `${modalConfig.width}px`);
        }

        if (typeof content === "string") {
            $modal.find(".disguised-modal-body").text(content);
        } else {
            content.appendTo($modal.find(".disguised-modal-body"));
        }

        $("#disguised-page").append($modal);
        return $modal;
    }

    function popMsg(msg, type = 'ok') {
        $('.nd_msg').length > 0 && $('.nd_msg').remove();
        let $msg = $(`<div class="nd_msg nd_msg-${type}">${msg}</div>`);
        $('body').append($msg);
        $msg.slideDown(200);
        setTimeout(() => { $msg.fadeOut(500); }, type == 'ok' ? 2000 : 5000);
        setTimeout(() => { $msg.remove(); }, type == 'ok' ? 2500 : 5500);
    }

    ///////////////////////////// 站点开始

    /**
     * 起点
     */
    function qidian() {
        GM_addStyle(`
        #right-container {
            position: unset;
            height: 100%;
        }
        .chapter-end-qrcode { display: none; }
        .review-icon { background: var(--surface-gray-100) !important; }
        .review-count { color: var(--surface-gray-200) !important; }
        .tooltip-wrapper { display: none; }
        #side-sheet div, #side-sheet section { background-color: #FFF; }
        .chapter-date { background: unset !important; }
        button {
            background-color: ${link_bg_color} !important;
            color: ${link_text_color} !important;
        }
        button > span { color: ${link_text_color} !important; }

        .excel-table tbody td, .excel-table tbody td p { font-family: unset; }
        .excel-table tbody td p { margin-top: 0 !important; }
        `);

        const $mainContent = $("main.content");
        const contentId = $mainContent.attr('id');
        const dataType = $mainContent.attr('data-type');
        const $tbody = $(".excel-table tbody");

        const scriptContent = $('#vite-plugin-ssr_pageContext').html();
        if (scriptContent && scriptContent.includes('"freeStatus":0')) {
            // 免费
            setExcelContent($("main.content"), 'p', true);
            setTimeout(function () {
                setExcelContent($("main.content"), 'p');
                setExcelLines([$(".nav-btn-group")], true);
                setInfo();
            }, 2000);
        } else {
            if (!$('main.content').hasClass('lock-mask')) {
                // 收费
                const targetNode = document.querySelector('main.content');
                const observerConfig = {childList: true};
                const callback = function (mutationsList, observer) {
                    for (let mutation of mutationsList) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            $tbody.attr("id", contentId);
                            $tbody.attr("data-type", dataType);
                            $tbody.addClass("content");
                            setExcelContent($("main.content"), 'p', true);
                            setTimeout(function () {
                                setExcelContent($("main.content"), 'p');
                                setExcelLines([$(".nav-btn-group")], true);
                            }, 2000);
                            setInfo();
                            observer.disconnect();
                            break;
                        }
                    }
                };
                const observer = new MutationObserver(callback);
                observer.observe(targetNode, observerConfig);
            } else {
                // 未解锁
                setExcelLines($(".chapter-wrapper section:not(#r-recommends) > div:not(.download)").toArray());
            }
        }
        setInfo();

        addExcelStyle(`
            #disguised-page #disguised-body table.excel-table tbody:not(thead) tr .nav-btn-group a {
                font-family: "Microsoft YaHei", "SimSun", sans-serif !important;
            }
            #disguised-page #disguised-body table.excel-table tbody td:not(:nth-child(1)):not(:nth-child(2)) {
                font-family: "Microsoft YaHei", "SimSun", sans-serif !important;
            }
            .nav-btn { padding: 0; }
            .excel-table button {
                padding: 0;
                font-size: unset;
                line-height: unset;
                height: 20px;
            }
        `);

        function setInfo() {
            const titleEl = $('.chapter-wrapper h1.title');
            setDisguisedTitle(titleEl.children().remove().end().text());
            titleEl.hide();

            const infoEl = titleEl.next();
            setDisguisedFooter(infoEl.children());
            infoEl.hide();

            const downloadEl = $('#r-authorSay :contains("下载App")');
            downloadEl.hide();
        }

        setTimeout(function () {
            const admireBtnEl = $('._admireBtn_131ir_200');
            admireBtnEl.hide();
            $('body').attr('data-theme', 'beige');
        }, 2000);
    }

    /**
     * 番茄
     */
    function fanqie() {
        GM_addStyle(`
        .muye-reader-nav { display: none !important; }
        .byte-btn {
            background: ${link_bg_color} !important;
            color: ${link_front_color} !important;
        }
        .reader-toolbar { display: none; }
        .muye-reader-box { padding-top: 50px; }
        .excel-table tbody td, .excel-table tbody td p { font-family: unset; }
        p { margin: 0; }
        `);

        const titleEl = $('h1.muye-reader-title');
        setDisguisedTitle(titleEl.text());
        titleEl.remove();

        const infoEl = $('.muye-reader-subtitle');
        setDisguisedFooter(infoEl.children());
        infoEl.hide();

        const $readerBox = $('.muye-reader-box');
        if ($readerBox.length) {
            const styleAttr = $readerBox.attr('style') || '';
            addExcelStyle(`
            .excel-table tbody td p {
                ${styleAttr}
            }
            `);
        }

        setExcelLines($(".muye-reader-content>div>p").toArray());
        setExcelLines([$(".muye-reader-btns")], true);
        addExcelStyle(`
            .muye-reader-btns button {
                height: 20px !important;
                line-height: 20px !important;
            }
        `);
        $(".muye-reader-btns button").on("click", function () {
            setTimeout(function () { location.reload(); }, 200);
        });

        $(".arco-tooltip").remove();
    }

    /**
     * 微信读书
     * 正文是 canvas 像素无法提取文字, 整体策略: 把 canvas 容器 detach 后塞进 B 列单元格,
     * 用 rowspan 让它跨越 N 行, 序号与右侧假数据列正常排布.
     */
    function weread() {
        GM_addStyle(`
        /* 关键: 让原 #app 留在 DOM 中可渲染, 但移出视口
           否则 display:none 会导致 Vue 探测 rootHeight=0 而不绘制 canvas */
        body > #app {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: -100000px !important;
            width: 1200px !important;
            height: auto !important;
            visibility: visible !important;
            pointer-events: none;
        }
        /* 伪装层始终在最上面 */
        #disguised-page { z-index: 100000; }

        .readerTopBar, .readerControls, .readerFooter, .readerNotePanel,
        .readerCatalog, .reader-font-control-panel-wrapper,
        .wr_dialog, .arco-tooltip, .wr_tooltip_item { display: none !important; }

        .excel-table tbody td, .excel-table tbody td p { font-family: unset; }
        .excel-table .weread-canvas-cell {
            padding: 0 !important;
            vertical-align: top;
            background-color: #FFF !important;
        }
        .excel-table .weread-canvas-cell .wr_canvasContainer {
            position: relative !important;
            margin: 0 auto;
            pointer-events: auto;
        }
        .excel-table .weread-nav-cell {
            text-align: center;
            padding: 8px !important;
        }
        .excel-table .weread-nav-cell button {
            background-color: ${link_bg_color} !important;
            color: ${link_text_color} !important;
            border: 1px solid #c0c0c0;
            padding: 2px 12px;
            margin: 0 5px;
            font-size: 12px;
            cursor: pointer;
            height: 22px;
            line-height: 18px;
        }
        `);

        // 把 common() 加在 #app 上的 inline display:none 移除
        $('#app').css('display', '');

        function waitForCanvas(maxWaitMs, onReady, onTimeout) {
            const startedAt = Date.now();
            let attempts = 0;
            const timer = setInterval(function () {
                attempts++;
                const $container = $('.wr_canvasContainer');
                const $canvases = $container.find('canvas');
                const styleAttr = $container.attr('style') || '';
                const heightMatch = styleAttr.match(/height:\s*(\d+)px/i);
                const totalHeight = heightMatch ? parseInt(heightMatch[1]) : 0;

                if (attempts === 1 || attempts % 10 === 0) {
                    printLog(`waitForCanvas: container=${$container.length}, canvases=${$canvases.length}, height=${totalHeight}, style="${styleAttr.slice(0, 80)}"`);
                }

                if ($container.length > 0 && $canvases.length > 0 && totalHeight > 100) {
                    clearInterval(timer);
                    printLog(`canvas 就绪, 总高 ${totalHeight}px, 共 ${$canvases.length} 张`);
                    onReady($container, totalHeight);
                } else if (Date.now() - startedAt > maxWaitMs) {
                    clearInterval(timer);
                    printLog("error", `等待 canvas 渲染超时, 最后状态: container=${$container.length}, canvases=${$canvases.length}, height=${totalHeight}`);
                    if (typeof onTimeout === 'function') onTimeout();
                }
            }, 200);
        }

        function buildNavRow($tbody, rowIndex) {
            const $prevBtnSrc = $('.readerContentHeader .readerHeaderButton').first();
            const $nextBtnSrc = $('.readerFooter .readerFooter_button').first();
            printLog(`查找翻页按钮: 上一章=${$prevBtnSrc.length}, 下一章=${$nextBtnSrc.length}`);

            const $navRow = $('<tr></tr>');
            $navRow.append($('<td></td>').text(rowIndex));
            const $navCell = $(`<td class="weread-nav-cell"></td>`);
            if ($prevBtnSrc.length) {
                const $prevBtn = $('<button>上一章</button>');
                $prevBtn.on('click', function () { $prevBtnSrc[0].click(); });
                $navCell.append($prevBtn);
            }
            if ($nextBtnSrc.length) {
                const $nextBtn = $('<button>下一章</button>');
                $nextBtn.on('click', function () { $nextBtnSrc[0].click(); });
                $navCell.append($nextBtn);
            }
            if (!$prevBtnSrc.length && !$nextBtnSrc.length) {
                $navCell.text('(未找到翻页按钮)');
            }
            $navRow.append($navCell);
            for (let i = 0; i < config.emptyCols; i++) {
                let tdContent = "";
                if (config.enableExcelRandomPopulate && i < config.maxExcelRandomPopulateCol) {
                    tdContent = generateRandomContent(i);
                }
                $navRow.append($(`<td>${tdContent}</td>`));
            }
            $tbody.append($navRow);
        }

        // 提前给个占位标题, 真正的章节名等 Vue 渲染完再读取
        setDisguisedTitle("工作簿1");
        setDisguisedFooter("");

        function refreshTitleFromDOM() {
            const chapterTitle = $('.readerTopBar_title_chapter').text().trim();
            const bookTitle = $('.readerTopBar_title_link').text().trim();
            if (chapterTitle) setDisguisedTitle(chapterTitle);
            if (bookTitle) setDisguisedFooter(`《${bookTitle}》`);
            printLog(`刷新标题: 章节="${chapterTitle}", 书名="${bookTitle}"`);
        }

        waitForCanvas(15000, function ($container, canvasTotalHeight) {
            // canvas 就绪 = Vue 渲染完成, 此时读标题最稳
            refreshTitleFromDOM();
            const rowHeight = 22;
            const scale = config.wereadCanvasScale || 1;
            const scaledCanvasHeight = Math.ceil(canvasTotalHeight * scale);
            const canvasRowSpan = Math.max(5, Math.ceil(scaledCanvasHeight / rowHeight));

            const $tbody = $(".excel-table > tbody");
            $tbody.empty();

            // 读取容器原始宽度 (微信读书固定 798), 准备缩放
            const origStyleAttr = $container.attr('style') || '';
            const widthMatch = origStyleAttr.match(/width:\s*(\d+)px/i);
            const origWidth = widthMatch ? parseInt(widthMatch[1]) : 798;
            const scaledWidth = Math.ceil(origWidth * scale);

            const $detachedContainer = $container.detach();

            // 用 wrapper 提供新的布局盒子, 内部 canvas 容器靠 transform 缩放
            const $scaleWrapper = $('<div class="weread-canvas-scale-wrapper"></div>').css({
                width: scaledWidth + 'px',
                height: scaledCanvasHeight + 'px',
                overflow: 'hidden',
                position: 'relative'
            });
            $detachedContainer.css({
                transform: `scale(${scale})`,
                'transform-origin': 'top left',
                position: 'absolute',
                top: '0',
                left: '0'
            });
            $scaleWrapper.append($detachedContainer);

            const $firstRow = $('<tr></tr>');
            $firstRow.append($('<td></td>').text(1));
            const $canvasCell = $('<td class="weread-canvas-cell"></td>').attr('rowspan', canvasRowSpan);
            $scaleWrapper.appendTo($canvasCell);
            $firstRow.append($canvasCell);
            for (let i = 0; i < config.emptyCols; i++) {
                let tdContent = "";
                if (config.enableExcelRandomPopulate && i < config.maxExcelRandomPopulateCol) {
                    tdContent = generateRandomContent(i);
                }
                $firstRow.append($(`<td>${tdContent}</td>`));
            }
            $tbody.append($firstRow);

            for (let r = 2; r <= canvasRowSpan; r++) {
                const $tr = $('<tr></tr>');
                $tr.append($('<td></td>').text(r));
                for (let i = 0; i < config.emptyCols; i++) {
                    let tdContent = "";
                    if (config.enableExcelRandomPopulate && i < config.maxExcelRandomPopulateCol) {
                        tdContent = generateRandomContent(i);
                    }
                    $tr.append($(`<td>${tdContent}</td>`));
                }
                $tbody.append($tr);
            }

            buildNavRow($tbody, canvasRowSpan + 1);

            const reRenderObserver = new MutationObserver(function () {
                const $newContainer = $('.app_content .wr_canvasContainer').not($canvasCell.find('.wr_canvasContainer'));
                if ($newContainer.length) {
                    const styleAttr = $newContainer.attr('style') || '';
                    const heightMatch = styleAttr.match(/height:\s*(\d+)px/i);
                    const newHeight = heightMatch ? parseInt(heightMatch[1]) : 0;
                    if (newHeight > 100) {
                        printLog("检测到章节切换, 刷新页面");
                        setTimeout(function () { location.reload(); }, 200);
                    }
                }
            });
            reRenderObserver.observe(document.body, {childList: true, subtree: true});
        }, function () {
            const $tbody = $(".excel-table > tbody");
            $tbody.empty();
            const $errRow = $('<tr></tr>');
            $errRow.append($('<td></td>').text(1));
            $errRow.append($('<td style="color:#c33;padding:10px !important;">canvas 加载超时, 请刷新页面重试. 如多次失败, 检查 F12 控制台日志.</td>'));
            for (let i = 0; i < config.emptyCols; i++) {
                $errRow.append($('<td></td>'));
            }
            $tbody.append($errRow);
            buildNavRow($tbody, 2);
        });
    }

    ///////////////////////////// 站点结束

    // E 键切换原始界面
    document.addEventListener('keydown', function (event) {
        if (event.key === 'e' && !event.ctrlKey && !event.altKey && !event.metaKey) {
            if (config.mode === DICT.MODE.ORIGINAL) {
                applyMode(config.lastVisibleMode);
            } else {
                applyMode(DICT.MODE.ORIGINAL);
            }
        }
    });

    // 老板键 R: 切换正文列 (B列) 的可见性, 起点/番茄/微信读书通用
    // 通过 body 上的 class 控制, 动态新增的行也会自动生效
    GM_addStyle(`
        body.boss-mode .excel-table > tbody > tr > td:nth-child(2),
        body.boss-mode .excel-table > tbody > tr > td:nth-child(2) * {
            visibility: hidden !important;
        }
    `);
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'r' || event.ctrlKey || event.altKey || event.metaKey) return;
        const tag = (event.target && event.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target && event.target.isContentEditable)) return;
        const hidden = document.body.classList.toggle('boss-mode');
        printLog(`老板键 R: 正文列 ${hidden ? '已隐藏' : '已显示'}`);
    });

    // 原始模式: 仅提示按 E 开启
    if (config.mode === DICT.MODE.ORIGINAL) {
        GM_addStyle(`
        .nd-switch-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: row;
            align-items: center;
            height: auto;
            padding: 2rem;
            border-radius: 1rem;
            background: rgba(255, 255, 255, 0.6);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
            color: black;
            font-size: 14px;
        }

        .nd-switch-key {
            border: solid 1px black;
            border-radius: 8px;
            width: 1.5rem;
            height: 1.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 5px;
        }
        `);
        const $indicator = $(`<div class="nd-switch-indicator">按<div class="nd-switch-key">E</div>键开启伪装</div>`);
        $indicator.appendTo(document.body);
        GM_registerMenuCommand("设置", settings);
        return;
    }

    // main: 仅适配起点和番茄
    const currentHost = window.location.host;
    printLog('currentHost', currentHost);

    switch (currentHost) {
        case 'www.qidian.com':
            common();
            qidian();
            break;
        case 'fanqienovel.com':
            common();
            fanqie();
            break;
        case 'weread.qq.com':
            common();
            weread();
            break;
        default:
            printLog("error", "当前站点未适配 (本精简版仅支持起点/番茄/微信读书)");
    }

    GM_registerMenuCommand("设置", settings);

    printLog("novel-disguise(mini) 载入完成");
})();
