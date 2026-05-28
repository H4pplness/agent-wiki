const minimist = require('minimist');
const { print, printErr } = require('./output/formatter');

function run(argv) {
  const args = minimist(argv, {
    string: ['desc', 'file'],
    boolean: ['confirm', 'help'],
    alias: { d: 'desc', h: 'help' },
  });

  const positional = args._;

  if (args.help || positional.length === 0) {
    printHelp();
    return;
  }

  // agent-wiki domains
  if (positional[0] === 'domains') {
    require('./commands/domains').run();
    return;
  }

  const domain  = positional[0];
  const command = positional[1];

  if (!command) {
    printErr(`Missing command. Usage: agent-wiki <domain> <command>`);
    printHelp();
    process.exit(1);
  }

  switch (command) {
    case 'init':
      require('./commands/init').run(domain, args);
      break;

    case 'schema': {
      const subCmd = argv[2];
      const content = argv.slice(3).join(' ');
      require('./commands/schema').run(domain, subCmd, [content]);
      break;
    }

    case 'view':
      require('./commands/view').run(domain, positional[2]);
      break;

    case 'write':
      require('./commands/write').run(domain, argv[2], argv.slice(3).join(' '));
      break;

    case 'replace': {
      require('./commands/replace').run(domain, positional[2], positional[3], positional[4]);
      break;
    }

    case 'patch': {
      require('./commands/patch').run(
        domain,
        argv[2],
        argv.length > 3 ? argv.slice(3).join(' ') : undefined,
        args
      );
      break;
    }

    case 'list':
      require('./commands/list').run(domain, positional[2]);
      break;

    case 'delete':
      require('./commands/delete').run(domain, args);
      break;

    default:
      printErr(`Unknown command: "${command}". Use --help for usage.`);
      process.exit(1);
  }
}

function printHelp() {
  print('');
  print('agent-wiki — CLI knowledge base for AI agents');
  print('');
  print('Usage:');
  print('  agent-wiki <domain> init --desc "<description>"');
  print('  agent-wiki <domain> schema');
  print('  agent-wiki <domain> schema edit "<content>"');
  print('  agent-wiki <domain> view <path>');
  print('  agent-wiki <domain> write <path> "<content>"');
  print('  agent-wiki <domain> patch <path> --file <patch-file>');
  print('  agent-wiki <domain> list [path]');
  print('  agent-wiki <domain> delete --confirm');
  print('  agent-wiki domains');
  print('');
}

module.exports = { run };
