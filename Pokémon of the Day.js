// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: star;
// ------------------------------------------
//              POKÉMON OF THE DAY
// ------------------------------------------
// 
// THIS WIDGET DISPLAYS A RANDOM POKEMON FOR
// EVERY DAY. IT USES POKEAPI.CO TO FETCH POKEMON
// 
// FEATURES
// - NAME
// - IMAGE
// - TYPES
// - HEIGHT and WEIGHT
// - BACKGROUND COLOR BASED ON TYPE
// - ENGLISH AND GERMAN LANGUAGE
// - LINKS TO BULBAPEDIA/POKEWIKI WHEN DISPLAYED 
//   IN APP
// 
// USAGE:
// - BEST SET "WHEN INTERACTING" TO "RUN SCRIPT" 
// - PARAMETER: 
//   [MAX_ID[;UPDATE_INTERVAL]]
//
//   - MAX_ID (OPTIONAL)
//     SET MAXIMUM ID OF POKEMON TO
//     CHOOSE FROM. DEFAULT IS 898. 
// 
//     E.G. SET TO 151 TO ONLY USE POKEMON FROM
//     GENERATION I.
//
//     USE VALUE "#<ID>" TO PERMANENTLY DISPLAY
//     YOUR FAVOURITE POKEMON WITH ID 001-898.
//
//   - UPDATE_INTERVAL (OPTIONAL)
//     SET THE UPDATE INTERVAL IN HOURS [1-24]. 
//     DEFAULT IS 24.
//
//   - EXAMPLES
//     151   -> DISPLAY A NEW RANDOM POKEMON FROM
//              THE FIRST 151 EVERY DAY
//     151;8 -> DISPLAY A NEW RANDOM POKEMON FROM
//              THE FIRST 151 EVERY 8 HOURS
//     #25   -> DISPLAY PIKACHU PERMANENTLY
//     ;1    -> DISPLAY A NEW RANDOM POKEMON 
//              EVERY HOUR
//
// PLEASE NOTE
// - THE SCRIPT CACHES THE POKEMON DATA AND 
//   IMAGES IN YOUR ICLOUD NEXT TO THIS SCRIPT
// 
// ------------------------------------------

// pokemonId;updateInterval by parameter
const param = args.widgetParameter
const paramArray = param ? param.split(";") : [""]
const pokemonId = paramArray[0]
const updateInterval = paramArray.length == 2 && Number.isInteger(parseInt(paramArray[1])) && parseInt(paramArray[1]) > 0 ? parseInt(paramArray[1]) : 24

// language
const isGerman = Device.locale() == "de_DE"
const language = isGerman ? "de" : "en"

// global functions + values for update interval
const getStartOfCurrentInterval = (interval) => (Math.floor(Date.now() / interval) * interval)
const updateIntervalInMillis = (updateInterval * 60 * 60 * 1000)
const currentIntervalStartInMillis = getStartOfCurrentInterval(updateIntervalInMillis)
const currentInterval = Math.floor(new Date().getHours() / updateInterval)



class PokemonOfTheDayWidget{
//   
// The Widget
// 

  constructor(){
    this.pokemonSelector = new PokemonSelector()
    this.pokemonDataService = new PokemonDataService()

    // init widget
    this.widget = new ListWidget()
    this.widget.setPadding( 0, 0, 0, 0 )
    this.widget.refreshAfterDate = new Date (currentIntervalStartInMillis + updateIntervalInMillis) // only update once in the given interval. Compute the start of the current interval and add one interval

    // init data
    this.defaultPokemonId = 132 // ditto
    this.initData()

    // widget + font size 
    this.widgetHeight = 338
    this.widgetWidth = 338
    this.largeWidget = config.runsInApp || config.runsWithSiri || config.widgetFamily == "large"
    this.imageScaleFactor =  this.largeWidget ? 0.8 : 0.3
    this.titleFontSize = this.largeWidget ? 18 : 11
    this.infoFontSize = this.largeWidget ? 14: 10
    this.weblinkFontSize = 10

    // url
    this.bulbapediaUrl = (name) => encodeURI(`https://m.bulbapedia.bulbagarden.net/wiki/${name.replace(" ","_").replace(".","")}`)
    this.pokewikiUrl = (name) => encodeURI(`https://pokewiki.de/${name.replace(" ","_").replace(".","")}`)

  }

  async initData() {
    // always keep the data of the default pokemon in the cache
    let defaultData = await this.pokemonDataService.getData(this.defaultPokemonId)
    this.defaultImage = await this.pokemonDataService.getImage(this.defaultPokemonId, defaultData.imageUrl)
  }

  async createWidget(paramId) {
    // get the id of the pokemon of today
    let id = this.pokemonSelector.getPokemonIdOfToday(paramId)
    // get the data and image of the pokemon
    let data = await this.pokemonDataService.getData(id)
    
    // no data 
    if ( data ) {
      let image = await this.pokemonDataService.getImage(id, data.imageUrl)
      if ( image ) {
        this.fillPokemonWidget(data,image)
        return this.widget
      }
    }
    this.fillErrorWidget()
    return this.widget
  }

  fillErrorWidget(){
    this.addTitle(`Oh no! No Pokémon was found.`)
    if (this.defaultImage instanceof Image){
      this.addImage(this.defaultImage)
    } else {
      this.widget.addSpacer(18)
    }
    this.addInfo(`Something went wrong.\nPlease try again later.`)
    this.widget.backgroundGradient = this.getBackgroundForType("normal")
  }

  fillPokemonWidget(data,image){
    // title
    const wTitle = this.addTitle(data.name[language])
    // image
    const wImage = this.addImage(image)
    // types
    const generalInfoText = `#${ data.id } | ${ data.types.map(type => this.capitalizeFirstLetter(this.getLocaleOfType(type))).join(" • ") }`
    // dimensions
    const appearanceInfoText = `${ data.height * 10}cm • ${ Number((data.weight * 0.1).toFixed(1))}kg`
    // info
    const infoSeparatorText = this.largeWidget ? " | " : "\n"
    const wInfo = this.addInfo(generalInfoText + infoSeparatorText + appearanceInfoText)
    // weblink
    if (config.runsInApp) {
      this.addWebLink(data.name[language], [wTitle, wImage, wInfo])
    }
    // background
    this.widget.backgroundGradient = this.getBackgroundForType(data.types[0])
  }

  addTitle(str){
    const wTitle = this.widget.addText(str)
    wTitle.textColor = new Color("#131313")
    wTitle.font = Font.boldSystemFont(this.titleFontSize)
    wTitle.centerAlignText()
    return wTitle
  }

  addImage(image){
    const wSprite = this.widget.addImage( image )
    wSprite.imageSize = new Size(this.widgetWidth * this.imageScaleFactor, this.widgetHeight * this.imageScaleFactor)
    wSprite.centerAlignImage()
    return wSprite
  }

  addInfo(str){
    const wInfo = this.widget.addText(str)
    wInfo.textColor = new Color("#383838")
    wInfo.font = Font.lightRoundedSystemFont(this.infoFontSize)
    wInfo.centerAlignText()
    return wInfo
  }

  addWebLink(pokemonName, elementsToLink){
    // link hint
    const wLinkHint= this.widget.addText(isGerman ? "Tippe um PokéWiki zu besuchen" : "Tap to visit Bulbapedia")
    wLinkHint.textColor = new Color("#383838")
    wLinkHint.font = Font.lightRoundedSystemFont(this.weblinkFontSize)
    wLinkHint.centerAlignText()
    // add links
    const link = isGerman ? this.pokewikiUrl(pokemonName) : this.bulbapediaUrl(pokemonName)
    elementsToLink.forEach( e => e.url = link)
    wLinkHint.url = link
  }

  getBackgroundForType(type){
    const typeColorMap = {
      "poison": "#E0C2ED",
      "steel": "#E1E1E1",
      "fighting": "#DDBCAB",
      "dragon": "#D6EEF4",
      "normal": "#D9CECF",
      "dark": "#F4F4F4",
      "bug": "#BDF9B2",
      "electric": "#FDFB95",
      "fire": "#F5B3B3",
      "water": "#B0E5F3",
      "grass": "#C7FC89",
      "ice": "#C1E9F4",
      "fairy": "#F5CDF4",
      "ground": "#DDBCAB",
      "psychic": "#D6B9F7",
      "rock": "#E0E0E0",
      "ghost": "#E5CDFF",
      "flying": "#CDEFFF"
    }
    let baseColorHex = typeColorMap.hasOwnProperty(type) ? typeColorMap[type] : "#ffffff"
    let startColor = new Color(this.lightenDarkenColor(baseColorHex, 20))
    let endColor = new Color(this.lightenDarkenColor(baseColorHex, -20))
    let gradient = new LinearGradient()
    gradient.colors = [startColor, endColor]
    gradient.locations = [0.0, 1]
    return gradient
  }
  
  getLocaleOfType(type){
    const typeTranslateMap = {
      "poison": "gift",
      "steel": "stahl",
      "fighting": "kampf",
      "dragon": "drache",
      "normal": "normal",
      "dark": "unlicht",
      "bug": "käfer",
      "electric": "elektro",
      "fire": "feuer",
      "water": "wasser",
      "grass": "pflanze",
      "ice": "eis",
      "fairy": "fee",
      "ground": "boden",
      "psychic": "psycho",
      "rock": "gestein",
      "ghost": "geist",
      "flying": "flug"
    }
    return isGerman ? typeTranslateMap[type] : type
  }

  lightenDarkenColor(col, amt) {
    col = col.replace(/^#/, '')
    if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2]
    let [r, g, b] = col.match(/.{2}/g);
    ([r, g, b] = [parseInt(r, 16) + amt, parseInt(g, 16) + amt, parseInt(b, 16) + amt])
    r = Math.max(Math.min(255, r), 0).toString(16)
    g = Math.max(Math.min(255, g), 0).toString(16)
    b = Math.max(Math.min(255, b), 0).toString(16)
    const rr = (r.length < 2 ? '0' : '') + r
    const gg = (g.length < 2 ? '0' : '') + g
    const bb = (b.length < 2 ? '0' : '') + b
    return `#${rr}${gg}${bb}`
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

class PokemonSelector {
// 
// Determine Pokemon to display based on 
// Parameter, Update Intervals, and current time
// 
  constructor(){
    this.randomDataCache = new RandomDataCache()
    this.maxPokemonId = 898
    this.singlePokemonIdPrefix = "#"
  }

  getPokemonIdOfToday(paramId){
    // directly selected id from parameter
    if (paramId.startsWith(this.singlePokemonIdPrefix)) {
      let pokemonId = parseInt(paramId.slice(1))
      if (Number.isInteger(pokemonId)){
        return pokemonId
      }
    }
    // parse param as integer
    let pokemonId = parseInt(paramId)
    pokemonId = Number.isNaN(pokemonId)? this.maxPokemonId : pokemonId
    // get random seed based on today
    const oneday = (24 * 60 * 60 * 1000)
    const todayInDays= getStartOfCurrentInterval(oneday) / oneday
    let randomSeed = this.randomDataCache.getRandomSeed(todayInDays)
    this.randomDataCache.saveRandomSeed(randomSeed)
    let random = randomSeed[todayInDays][currentInterval]
    // upper bound is given
    if (pokemonId > 0 && pokemonId <= this.maxPokemonId) {
      return Math.ceil( random * pokemonId )
    }
    // return fully random as fallback
    return Math.ceil( random * this.maxPokemonId )
  }
}

class PokemonDataService {
//
// Data Service to fetch Pokemon from Cache or Api
//  
  constructor(){
    this.pokeApi = new PokeApi()
    this.pokemonDataCache = new PokemonDataCache()
  }

  async getData(id) {
    let data = this.pokemonDataCache.getData(id)
    if ( data == null ) {
      data = await this.pokeApi.getData(id)
      if ( data != null) {
        this.pokemonDataCache.setData(data, id)
      }
    }
    return data
  }

  async getImage(id, imageUrl) {
    let image = this.pokemonDataCache.getImage(id)
    if ( image == null ) {
      image = await this.pokeApi.getImage(imageUrl)
      if ( image != null) {
        this.pokemonDataCache.setImage(image, id)
      }
    }
    return image
  }
}

class PokeApi {
// 
// Get Pokemon Data and Image from pokeapi
// 
  constructor() {
    this.pokeApiUrl = (path,id) => `https://pokeapi.co/api/v2/${path}/${id}`
  }

  async getData(id) {
    let data = {}
    try {
      let pokemonData = await new Request( this.pokeApiUrl( "pokemon", id ) ).loadJSON()
      let pokemonSpeciesData = await new Request( this.pokeApiUrl( "pokemon-species", id ) ).loadJSON()
      data.id = id
      data.name = { 
        "en" : pokemonSpeciesData.names.find(name => name.language.name == "en")["name"],
        "de" : pokemonSpeciesData.names.find(name => name.language.name == "de")["name"]
      }
      data.types = pokemonData.types.map(type => type.type.name)
      data.weight = pokemonData.weight
      data.height = pokemonData.height
      let imageUrl = pokemonData.sprites.other['official-artwork'].front_default
      if ( ! imageUrl ) {
        imageUrl = pokemonData.sprites.front_default
      }
      data.imageUrl = imageUrl
      return data
    } catch (e) {
      console.error(e)
    }
    return null
  }

  async getImage(imageUrl) {
    try {
      let imgRequest = new Request(imageUrl)
      return await imgRequest.loadImage()
    } catch (e) {
      return null
    }
  }
}

class WidgetDataCache {
// 
// Access the local Widget Data Cache
// 
  constructor() {
    this.fm = FileManager.iCloud()
    this.widgetDirectory = this.getWidgetDirectory()
  }

  getWidgetDirectory() {
    let directory = this.fm.joinPath( this.fm.documentsDirectory(), 'pokemonOfTheDay' )
    if ( ! this.fm.isDirectory(directory) ) {
      this.fm.createDirectory(directory)
    }
    return directory
  }
  
  deleteCacheOlderThan(days){
    const oneday = (24 * 60 * 60 * 1000)
    const xDaysAgo = ( Date.now() - (days * oneday) )
    this.fm.listContents(this.widgetDirectory)
    .map(path => this.fm.joinPath(this.widgetDirectory, path))
    .filter(path => this.fm.isDirectory(path))
    .filter(dir => ( this.fm.modificationDate(dir).getTime() < xDaysAgo ))
    .forEach(dir => {
      this.fm.remove(dir) 
    })
  }
}

class RandomDataCache extends WidgetDataCache {
// 
// Access the cache for the random data
// 
  constructor(){
    super()
    this.randomSeedFile = this.getRandomSeedFile()
  }

  getRandomSeedFile() {
    return this.fm.joinPath( this.widgetDirectory, 'randomseed.json' )
  }
  
  generateRandomSeedData(todayInDays) {
    let seedData = {}
    seedData[todayInDays] = {}
    for (let i=0; i<=23; i++) {
      seedData[todayInDays][i] = Math.random()
    }
    return seedData
  }

  saveRandomSeed (seedData) {
    this.fm.writeString( this.randomSeedFile, JSON.stringify(seedData) )
  }

  getRandomSeed(todayInDays) {
    if ( this.fm.fileExists(this.randomSeedFile) ) {
      try {
      let data = JSON.parse( this.fm.readString( this.randomSeedFile ) )
        if (data.hasOwnProperty(todayInDays)){
          return data
        }
      } catch (e) {
        console.error(e)
      }
    }
    return this.generateRandomSeedData(todayInDays)
  }
}

class PokemonDataCache extends WidgetDataCache {
// 
// Access the cache for the pokemon data
// 
  constructor() {
    super()
    this.pokemonDataFileName = (id) => `${id}-pokemon.json`
    this.pokemonImageFileName = (id) => `${id}-image.png`
  }

  getPokemonIdDirectory(id) {
    let directory = this.fm.joinPath(this.widgetDirectory, `${id}`)
    if ( ! this.fm.isDirectory(directory) ) {
      this.fm.createDirectory(directory)
    }
    return directory
  }

  getData(id) {
    try {
      let directory = this.getPokemonIdDirectory(id)
      let dataFilepath = this.fm.joinPath(directory, this.pokemonDataFileName(id))
      let data = JSON.parse( this.fm.readString( dataFilepath ) )
      return data
    } catch (e) {
      console.error(e)
    }
    return null
  }

  getImage(id) {
    try {
      let directory = this.getPokemonIdDirectory(id)
      let imageFilepath = this.fm.joinPath(directory, this.pokemonImageFileName(id))
      let image = this.fm.readImage(imageFilepath)
      return image
    } catch (e) {
      console.error(e)
    }
    return null
  }

  setData(data,id) {
    let directory = this.getPokemonIdDirectory(id)
    let dataFilepath = this.fm.joinPath( directory, this.pokemonDataFileName(id))
    this.fm.writeString( dataFilepath, JSON.stringify(data))
  }

  setImage(image,id) {
    let directory = this.getPokemonIdDirectory(id)
    let imageFilepath = this.fm.joinPath( directory, this.pokemonImageFileName(id))
    this.fm.writeImage(imageFilepath, image)
  }
}

// Widget
let widget = await new PokemonOfTheDayWidget().createWidget(pokemonId)
// display widget
await widget.presentLarge()
Script.setWidget( widget )
// complete
Script.complete()
// delete old cache
new WidgetDataCache().deleteCacheOlderThan(30)
