const fs = require('fs');
const path = require('path');

function replaceInPath(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInPath(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            content = content.replace(/'\/api\//g, "'/_/backend/");
            content = content.replace(/"\/api\//g, '"/_/backend/');
            content = content.replace(/`\/api\//g, "`/_/backend/");
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated ' + fullPath);
            }
        }
    }
}

replaceInPath('d:\\S6\\frontend\\src');
