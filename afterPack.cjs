const { rcedit } = require('rcedit')
const path = require('path')

module.exports = async function (context) {
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const icoPath = path.join(__dirname, 'resources', 'icon.ico')
  console.log('Embedding icon into', exePath)
  await rcedit(exePath, { icon: icoPath })
  console.log('Icon embedded successfully')
}
