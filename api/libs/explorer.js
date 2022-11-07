//@ts-nocheck
const fetch = require('node-fetch')
const Proxy = require('https-proxy-agent')
const fs = require('fs')
const {
  JSDOM
} = require('jsdom')
const {
  parse
} = require('node-html-parser')
const {
  utils
} = require('ethers')

let config = {}
// const PROXY = 'http://127.0.0.1:31211'
if (PROXY) {
  config = {
    agent: new Proxy(PROXY)
  }
}

let cachedData = {}
const CACHE_FILE = `${__dirname}/../data/cached_data.json`
if (fs.existsSync(CACHE_FILE)) {
  cachedData = JSON.parse(fs.readFileSync(CACHE_FILE))
}

const getHtmlText = async (address, page) => {
  const URL_PRIFIX = `https://etherscan.io/txs`
  const res = await fetch(`${URL_PRIFIX}?a=${address}&p=${page}`, config)
  return await res.text()
}

const htmlToTable = async (text) => {
  const dom = new JSDOM(text).window.document
  return dom.querySelector('table')
}

const tableToArray = async (table) => {
  if (table.querySelectorAll('tr td').length === 1) return []
  const titleIndexList = [1, 2, 3, 4, 5, 7, 8, 9]
  const bodyIndexList = [1, 2, 3, 4, 6, 8, 9, 10]
  let titleList = []
  let data = []
  const titleDomList = table.querySelectorAll('thead tr th')
  titleDomList.forEach((dom, index) => {
    if (!titleIndexList.includes(index)) return
    if (index === 4) titleList.push('Date')
    else if (index === 9) titleList.push('Txn Fee')
    else titleList.push(dom.textContent.trim())
  })
  const bodyDomList = table.querySelectorAll('tbody tr')
  bodyDomList.forEach(rowDom => {
    let i = 0
    let rowData = {}
    const columnDomList = rowDom.querySelectorAll('td')
    columnDomList.forEach((dom, index) => {
      if (!bodyIndexList.includes(index)) return
      const key = titleList[i]
      const value = dom.textContent.trim()
      rowData[key] = value
      i++
    })
    data.push(rowData)
  })
  return data
}

const getPageData = async (address, page) => {
  try {
    const text = await getHtmlText(address, page)
    const table = await htmlToTable(text)
    const array = await tableToArray(table)
    return array
  } catch (e) {
    return []
  }
}

const getNeedData = async (address, offset, limit) => {

  getAllData(address)
  if (cachedData[address]) {
    return [cachedData[address].slice(offset, limit), cachedData[`${address}-time`]]
  }
  const DEFAULT_COUNT_PER_PAGE = 50
  const startPage = Math.floor(offset / DEFAULT_COUNT_PER_PAGE) + 1
  const endPage = Math.floor((offset + limit - 1) / DEFAULT_COUNT_PER_PAGE) + 1
  const sliceOffset = offset % DEFAULT_COUNT_PER_PAGE

  let pageDatas = []
  for (let page = startPage; page <= endPage; page++) {
    const currentPageData = await getPageData(address, startPage)
    pageDatas = pageDatas.concat(currentPageData)
    if (currentPageData.length === 0) break
  }
  return [pageDatas.slice(sliceOffset, limit), 0]
}

const getAllData = async (address) => {
  if (cachedData[`${address}-loading`]) return
  cachedData[`${address}-loading`] = true
  let page = 1
  let data = []
  while (true) {
    // console.log(`开始缓存第 ${page} 页`)
    const currentPageData = await getPageData(address, page)
    data = data.concat(currentPageData)
    if (currentPageData.length === 0) break
    page++
  }
  delete cachedData[`${address}-loading`]
  cachedData[address] = data
  cachedData[`${address}-time`] = new Date().getTime()
  //   console.log(cachedData)
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedData), {
    flag: 'w+'
  })
  //   console.log('缓存完毕')
}

module.exports = async (req, res) => {
  const {
    a: addressSourceData = `0xeb2a81e229b68c1c22b6683275c00945f9872d90`,
    offset: offsetSourceData = '0',
    limit: limitSourceData = '50',
  } = req.query || {}
  let address = addressSourceData
  let offset = parseInt(offsetSourceData)
  let limit = parseInt(limitSourceData)
  if (Number.isNaN(offset) || offset < 0) offset = 0
  if (Number.isNaN(limit) || limit < 0) limit = 50
  if (!address.startsWith('0x')) address = `0x${address}`

  let responseData = {
    success: true,
    statusCode: 0,
    message: 'DONE',
    receivedAddress: address,
    receivedLimit: limit,
    receivedOffset: offset,
    count: 0,
    data: [],
    cache: 0, // 0 means no chache, others means cached timestamp
  }

  if (!utils.isAddress(address)) {
    responseData.success = false
    responseData.statusCode = 1
    responseData.message = 'INVALID_DATA'
    res.send(responseData)
    return
  }

  const [data, cache] = await getNeedData(address, offset, limit)
  responseData.count = data.length
  responseData.data = data
  responseData.cache = cache


  res.send(responseData)
}
