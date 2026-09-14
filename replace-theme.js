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
    .replace(/premium-green/g, 'premium-blue')
    .replace(/bg-green-/g, 'bg-blue-')
    .replace(/text-green-/g, 'text-blue-')
    .replace(/border-green-/g, 'border-blue-')
    .replace(/border-t-green-/g, 'border-t-blue-')
    .replace(/from-green-/g, 'from-blue-')
    .replace(/to-green-/g, 'to-blue-')
    .replace(/--primary-green/g, '--primary-blue')
    .replace(/rgba\(0, 77, 40,/g, 'rgba(30, 58, 138,') /* rgb for #004d28 */
    .replace(/rgba\(0, 38, 20,/g, 'rgba(23, 37, 84,'); /* rgb for #002614 */
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
