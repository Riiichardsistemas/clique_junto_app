const archiver = require('archiver');

/**
 * Faz stream de um ZIP com as fotos para a resposta HTTP.
 * `files` = [{ path: caminhoAbsoluto, name: nomeNoZip }]
 */
function streamZip(res, files, filename = 'album.zip') {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    res.status(500).end();
    throw err;
  });
  archive.pipe(res);

  files.forEach((f) => archive.file(f.path, { name: f.name }));
  return archive.finalize();
}

module.exports = { streamZip };
