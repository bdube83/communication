const fs = require('fs')

const township = 'Tshelimnyama'
const town = 'Pinetown'
const latitude = -31.0000098000
const longitude = 25.00000988

const folder = `${township.toLowerCase()}-${town.toLowerCase()}/(${latitude},${longitude})`

const imgFolder = fs.mkdirSync(`./views/images/${folder}`)
console.log('Creating img folder: ' + folder)