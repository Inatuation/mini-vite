const Koa = require('koa');
const app = new Koa();
const fs = require('fs');
const path = require('path');
const complierSFC = require('@vue/compiler-sfc');
const compilerDOM = require('@vue/compiler-dom');
const htmlType = 'text/html';
const jsCtxType = 'application/javascript'

app.use(async (ctx) => {
    const { url, query } = ctx.request;
    if (url === '/') {
        // 读取html内容并返回
        const htmlFile = fs.readFileSync(path.join(__dirname, '/src/index.html'), 'utf8');
        ctx.type = htmlType;
        ctx.body = htmlFile;
    } else if (url.endsWith('.js')) {
        // 处理.js结尾的js文件请求
        const jsFile = fs.readFileSync(path.join(__dirname, '/src/', url), 'utf8');
        ctx.type = jsCtxType;
        ctx.body = transformModuleImport(jsFile);
    } else if (url.startsWith('/node_modules/')) {
        // 加载node_module下的裸模块
        // 读取模块下package.json的module字段，即该模块打包之后的输出文件
        const prefix = path.join(__dirname, url);
        const module = require(path.join(prefix, '/package.json')).module;
        const filePath = fs.readFileSync(path.join(prefix, module), 'utf8');
        ctx.type = jsCtxType;
        ctx.body = transformModuleImport(filePath);
    } else if (url.indexOf('.vue') > -1) {
        const source = path.join(__dirname, '/src', url.split('?')[0]);
        const code = complierSFC.parse(fs.readFileSync(source, 'utf8'));
        if (!query.type) {
            // 处理sfc文件
            // 读取vue文件，获取脚本部分内容
            // 硬编码
            // 将script内容替换掉export default作为变量存起来
            const scriptContent = code.descriptor.script.content.replace(/export default/g, 'const __script = ');
            console.log(code)
            ctx.type = jsCtxType;
            ctx.body = `
                ${transformModuleImport(scriptContent)}
                // 解析template,重新生成一个引用请求，去解析template内容
                import { render as __render } from '${url}?type=template';
                import '${url}?type=style';
                __script.render = __render;
                export default __script;
            `;
        } else if (query.type === 'template'){
            // 有type查询参解析template部分内容
            const tpl = code.descriptor.template.content;
            const render = compilerDOM.compile(tpl, { mode: 'module' }).code;
            ctx.type = jsCtxType;
            ctx.body = transformModuleImport(render);
        } else if (query.type === 'style') {
            // 有type查询参解析style部分内容
            const styles = code.descriptor.styles;
            let __style = '';
            for (let i = 0; i < styles.length; i++) {
                __style += styles[i].content.replace(/(\r\n|\n|\r)/g, ''); ;
            }
            ctx.type = jsCtxType;
            ctx.body = `
                const style = document.createElement('style');
                style.setAttribute('type', 'text/css');
                style.textContent = '${__style}';
                document.head.appendChild(style);
            `;
        }
    }
});

// 重写import，加载裸模块
function transformModuleImport(content) {
    content = content.replace(/\s+from\s+['"](.*)['"]/g, (s1, s2) => {
        if (s2.startsWith('/') || s2.startsWith('./') || s2.startsWith('../')) {
            // 相对路径的文件读取，无需处理
            return s1;
        } else {
            // 裸模块，处理成/@modules的形式
            return ` from '/node_modules/${s2}';`
        }
    });
    return content;
}

app.listen(3000).on('listening', () => {
    console.log('listening on 3000');
});