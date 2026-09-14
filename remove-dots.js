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
  let newContent = content.replace(/<div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient\(circle at center, #ffffff 1px, transparent 1px\)', backgroundSize: '32px 32px' }}><\/div>/g, '');
  newContent = newContent.replace(/ style={{ backgroundImage: "radial-gradient\(#1d70b822 1px, transparent 1px\)", backgroundSize: "32px 32px" }}/g, '');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Removed dots in ${file}`);
  }
});
