function print(str) {
  process.stdout.write(str + '\n');
}

function printErr(str) {
  process.stderr.write(str + '\n');
}

function separator() {
  print('━'.repeat(44));
}

module.exports = { print, printErr, separator };
