/**
 * Expo config plugins resolve from apps/mobile/node_modules, but npm workspaces
 * hoist packages to the repo root. expo-router also requires `expo/config-plugins`,
 * which lives under apps/mobile/node_modules/expo — link both directions.
 */
const fs = require('fs')
const path = require('path')

const mobileNm = path.join(__dirname, '../apps/mobile/node_modules')
const rootNm = path.join(__dirname, '../node_modules')

function linkDir(target, linkPath) {
  if (!fs.existsSync(target)) {
    console.warn(`[link-expo-deps] skip missing target: ${target}`)
    return
  }
  if (fs.existsSync(linkPath)) return

  fs.mkdirSync(path.dirname(linkPath), { recursive: true })
  const type = process.platform === 'win32' ? 'junction' : 'dir'
  fs.symlinkSync(target, linkPath, type)
  console.log(`[link-expo-deps] linked ${path.basename(linkPath)}`)
}

// Hoisted deps: root → mobile (Expo resolves plugins from the app folder)
const hoistedToMobile = ['expo-router', 'expo-font', 'expo-splash-screen', 'expo-device']
for (const pkg of hoistedToMobile) {
  linkDir(path.join(rootNm, pkg), path.join(mobileNm, pkg))
}

// expo stays nested under mobile; root copy so hoisted expo-router can import expo/config-plugins
linkDir(path.join(mobileNm, 'expo'), path.join(rootNm, 'expo'))
