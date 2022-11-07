const explorer = require("./explorer");
const {
  expect
} = require("chai");

const getInput = (a, offset, limit) => {
  const req = {
    query: {
      a,
      offset,
      limit
    }
  }
  const res = {
    send(value) {
      res.data = value
    },
  }
  return [
    req, res,
  ]
}

const testData = async (address, offset, limit) => {
  const [req, res] = getInput(address, offset, limit)
  await explorer(req, res)
  return res.data
}

describe('address 测试', () => {
  it('address为空应该返回默认数据', async () => {
    const data = await testData()
    expect(data.success).to.be.equal(true)
    expect(data.receivedAddress).to.be.equal('0xeb2a81e229b68c1c22b6683275c00945f9872d90')
  })

  it('address应该默认补全0x', async () => {
    const data = await testData("eb2a81e229b68c1c22b6683275c00945f9872d90")
    expect(data.success).to.be.equal(true)
    expect(data.receivedAddress).to.be.equal('0xeb2a81e229b68c1c22b6683275c00945f9872d90')
  })

  it('address应该默认校验格式（包括大小写）', async () => {
    const data = await testData("eb2a81e229b68c1c22b6683275c00945f9872d9")
    expect(data.success).to.be.equal(false)
    expect(data.statusCode).to.be.equal(1)
    const data2 = await testData("0xEB2a81e229b68c1c22b6683275c00945f9872d90")
    expect(data.success).to.be.equal(false)
    expect(data.statusCode).to.be.equal(1)
  })

  it('请求得到的数据应该小于等于请求值', async () => {
    const data = await testData("0xeb2a81e229b68c1c22b6683275c00945f9872d90", 0, 10)
    expect(data.success).to.be.equal(true)
    expect(data.count).to.be.lessThanOrEqual(10)
  })

  it('应该有缓存', async () => {
    const data = await testData("eb2a81e229b68c1c22b6683275c00945f9872d90")
    expect(data.cache).to.be.not.equal(0)
  })



})
