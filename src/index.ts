import chalk from 'chalk';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';

interface Options {
    targetDir?: string;
    excludeDirs?: string[]; // 除外するディレクトリの配列を追加
    imgExtensions?: string;
    textExtensions?: string;
    quality?: number;
    enableLogs?: boolean;
}

const VitePluginWebpAndPath = (options: Options = {}) => {
    const {
        targetDir = './dist/',
        excludeDirs = [], // 除外するディレクトリのデフォルト値は空の配列
        imgExtensions = 'jpg,png',
        textExtensions = 'html,css',
        quality = 80,
        enableLogs = true,
    } = options;

    // excludeDirsを考慮してglobパターンを生成する関数
    const generateGlobPattern = (extensions: string[]) => {
        let patterns = extensions.map(ext => `${targetDir}/**/*.${ext}`);
        excludeDirs.forEach(excludeDir => {
            patterns = patterns.concat(extensions.map(ext => `!${path.join(targetDir, excludeDir, `**/*.${ext}`)}`));
        });
        return patterns;
    };

    const imgExtensionsArray: string[] = imgExtensions.split(',');
    const textExtensionsArray: string[] = textExtensions.split(',');

    const log = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
        if (enableLogs) {
            let output = message;
            switch (type) {
                case 'info':
                    output = chalk.blue(message);
                    break;
                case 'success':
                    output = chalk.green(message);
                    break;
                case 'error':
                    output = chalk.red(message);
                    break;
            }
            console.log(output);
        }
    };

    return {
        name: 'vite-plugin-webp-and-path',
        async writeBundle(): Promise<void> {
            try {
                // 画像とテキストのファイルパターンを生成
                const imagePatterns = generateGlobPattern(imgExtensionsArray);
                const textPatterns = generateGlobPattern(textExtensionsArray);

                // globを使用してファイルを取得
                const imageFiles: string[] = glob.sync(`{${imagePatterns.join(',')}}`);
                const textFiles: string[] = glob.sync(`{${textPatterns.join(',')}}`);
                log(`対象の画像: ${imageFiles.join(', ')}`, 'info');

                // 画像変換処理
                for (const file of imageFiles) {
                    const dir: string = path.dirname(file);
                    await imagemin([file], {
                        destination: dir,
                        plugins: [imageminWebp({ quality })],
                    });
                    log(`変換済み: ${file}`, 'success');
                }
                log('すべての画像をwebpに変換しました!', 'success');
                imageFiles.forEach((file: string) => {
                    fs.unlinkSync(file);
                });
                log('すべての元の画像を削除しました。');

                // パス置換処理
                for (const filePath of textFiles) {
                    const fileContent: string = fs.readFileSync(filePath, 'utf-8');
                    let updatedContent: string = fileContent;
                    imgExtensionsArray.forEach((ext) => {
                        const regex: RegExp = new RegExp(`\\.${ext}`, 'g');
                        updatedContent = updatedContent.replace(regex, '.webp');
                    });
                    fs.writeFileSync(filePath, updatedContent);
                    log(`画像パスを置換しました: ${filePath}`);
                }
                log('すべての画像パスを置換しました!', 'success');
            } catch (err) {
                log(`エラー: ${err}`, 'error');
            }
        },
    };
};

export default VitePluginWebpAndPath;
