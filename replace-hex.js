const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    .replace(/#004D28/gi, '#1d70b8')
    .replace(/#002614/gi, '#002d5c')
    .replace(/#003B1E/gi, '#0f4c81')
    .replace(/#115740/gi, '#1d70b8')
    .replace(/#004d28/gi, '#1d70b8');
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated hex in ${file}`);
  }
});
