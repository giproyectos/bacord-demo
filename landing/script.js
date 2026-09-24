document.getElementById('contact-form')?.addEventListener('submit', function (e) {
  e.preventDefault()
  const nombre = document.getElementById('lp-nombre').value.trim()
  const primerNombre = nombre.split(' ')[0] || ''
  document.getElementById('contact-thanks-title').textContent = primerNombre
    ? `¡Gracias, ${primerNombre}!`
    : '¡Gracias!'
  this.classList.add('hidden')
  document.getElementById('contact-thanks').classList.remove('hidden')
})
