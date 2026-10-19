(function () {
  try {
    var t = localStorage.getItem('voxly-theme')
    var mode = t === 'light' || t === 'dark' || t === 'system' ? t : 'dark'
    var systemDark = true
    try {
      systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      /* ignore */
    }
    var dark = mode === 'dark' || (mode === 'system' && systemDark)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch {
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  }
})()
