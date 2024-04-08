const dotenv = require('dotenv');

const API_URL = 'https://api.distancematrix.ai/maps/api/distancematrix/json';
const LIMIT_DISTANCE = 100

dotenv.config({ path: './config.env' });

exports.findPossibleDropOffSpots = async (allSpots, originLat, originLng) => {
    const distanceMatrixResponse = await fetch(constructApiCall(allSpots, originLat, originLng))

    if (!distanceMatrixResponse.ok) {
        if (distanceMatrixResponse.status === 404) {
            throw new Error('Data not found');
        } else if (distanceMatrixResponse.status === 500) {
            throw new Error('Server error');
        } else {
            throw new Error('Network response was not ok');
        }
    }

    const distanceMatrixData = await distanceMatrixResponse.json()
    const distances = distanceMatrixData['rows'][0]['elements']

    const possibleDistances = distances.filter(distance => distance['distance']['value'] <= LIMIT_DISTANCE)

    if(!possibleDistances){
        return []
    }

    let possibleDropOffSpots = []
    let latLong = ''

    allSpots.forEach(spot => {
        possibleDistances.forEach(distance => {
            latLong = spot.latitude.toString() + ',' + spot.longitude.toString()
            if(latLong === distance['destination']){
                possibleDropOffSpots.push(spot)
            }
        })
    });

    // console.log(data)
    return possibleDropOffSpots
}


const constructApiCall = (allSpots, originLat, originLng) => {
    let apiRequestString = `${API_URL}?origins=${originLat},${originLng}&destinations=`
    allSpots.forEach(spot => {
        apiRequestString += `${spot.latitude},${spot.longitude}|`
    })
    apiRequestString = apiRequestString.slice(0, -1)
    apiRequestString += `&mode=walking&key=${process.env.DISTANCE_MATRIX_KEY}`
    return apiRequestString
}

// const isDropOffSpotNear = ()

// fetch(API_URL)
//   .then(response => {
//     if (!response.ok) {
//       if (response.status === 404) {
//         throw new Error('Data not found');
//       } else if (response.status === 500) {
//         throw new Error('Server error');
//       } else {
//         throw new Error('Network response was not ok');
//       }
//     }
//     return response.json();
//   })
//   .then(data => {
//     outputElement.textContent = JSON.stringify(data, null, 2);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });