<br />
<b>Fatal error</b>:  Uncaught exception 'Exception' with message 'File does not exist: '../Secrets/Secrets.js'' in /Users/nwall/Sites/web/jane/DirectiveProcessor.php:16
Stack trace:
#0 /Users/nwall/Sites/web/jane/DirectiveProcessor.php(6): DirectiveProcessor::get_response('include', Array)
#1 /Users/nwall/Sites/web/jane/Parser.php(12): DirectiveProcessor::process('include', Array)
#2 /Users/nwall/Sites/web/jane/DirectiveProcessor.php(46): Parser::parse('!!!include('../...')
#3 /Users/nwall/Sites/web/jane/DirectiveProcessor.php(6): DirectiveProcessor::get_response('buildType', Array)
#4 /Users/nwall/Sites/web/jane/Parser.php(12): DirectiveProcessor::process('buildType', Array)
#5 /Users/nwall/Sites/web/jane/Includer.php(75): Parser::parse('// TODO: Any ar...')
#6 /Users/nwall/Sites/web/jane/jane.php(28): Includer::include_dir('Resync', 'Resync')
#7 /Users/nwall/Sites/web/jane/jane.php(18): build_script('Resync', '../Resync')
#8 /Users/nwall/Sites/web/tempo/Resync/build.php(7): require_once('/Users/nwall/Si...')
#9 {main}
  thrown in <b>/Users/nwall/Sites/web/jane/DirectiveProcessor.php</b> on line <b>16</b><br />
