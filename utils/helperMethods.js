const fs = require('fs')

const imagesRoot = `./views/images`

exports.createImagesFolder = async (latitude, longitude, township, town) => {

    township = removeSpaces(township)
    town = removeSpaces(town)

    const topFolder = `${township.toLowerCase()}-${town.toLowerCase()}`

    const folder = `${topFolder}/(${latitude},${longitude})`
  
    if(!fs.existsSync(`${imagesRoot}/${topFolder}`)){
      fs.mkdir(`${imagesRoot}/${topFolder}`, (error) => {
        if(error) throw error
        else if(!fs.existsSync(`${imagesRoot}/${folder}`)){
            fs.mkdir(`${imagesRoot}/${folder}`, (error) => {
                if(error) throw error
                else if(!fs.existsSync(`${imagesRoot}/${folder}`)){
                    console.log('Creating img folder:'+ folder)
                }
            })
          }
      })
    }
    else{
        if(!fs.existsSync(`${imagesRoot}/${folder}`)){
            fs.mkdir(`${imagesRoot}/${folder}`, (error) => {
                if(error) throw error
                else if(!fs.existsSync(`${imagesRoot}/${folder}`)){
                    console.log('Creating img folder:'+ folder)
                }
            })
          }
    }
  
    return folder
}

const removeSpaces = (value) => {
    return value.replace(' ', '')
}