// Delega al CLI con la versión real de Node; Angular valida su compatibilidad.
process.argv[1] = require.resolve('@angular/cli/bin/ng.js');
require('@angular/cli/bin/ng.js');
