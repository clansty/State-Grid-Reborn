const PKG = "com.sgcc.wsgw.cn"
const WEBHOOK_ID = "http://hass.local:8123/api/webhook/id"


function waitAndClickText(txt) {
    text(txt).waitFor()
    sleep(1000)
    let control = text(txt).findOne()
    let controlBounds = control.bounds()
    console.log(controlBounds, controlBounds.centerX(), controlBounds.centerY())
    console.log('点击', click(controlBounds.centerX(), controlBounds.centerY()))
}

function getElementNextToText(parent, txt, skipCount) {
    skipCount = skipCount || 0
    let found = false;
    let res, count = -1;
    parent.children().forEach(function (element) {
        if (element && element.text() && element.text().startsWith(txt)) {
            found = true
            return
        }
        if (!found) return;
        count++;
        if (count === skipCount)
            res = element
    })
    return res
}

function getAllElementNextToText(parent, txt, skipCount) {
    skipCount = skipCount || 0
    let found = false;
    let res = [], count = -1;
    parent.children().forEach(function (element) {
        if (element && element.text() && element.text().startsWith(txt)) {
            found = true
            return
        }
        if (!found) return;
        count++;
        if (count >= skipCount)
            res.push(element)
    })
    return res
}

function getElementBeforeText(parent, txt) {
    let found = false;
    let lastElement;
    parent.children().forEach(function (element) {
        if (element && element.text() && element.text().startsWith(txt)) {
            found = true
        }
        if (found) return
        lastElement = element
    })
    return lastElement
}

function swipeUp() {
    swipe(500, 2100, 500, 2100 - 140 * 5, 500)
}

function recordMonth() {
    let ancur = text('账单周期')
    ancur.waitFor()
    sleep(1000)
    let parent = ancur.findOne().parent()
    let row = getElementNextToText(parent, '电费(元)')

    let time = row.child(0).text()
    let amount = row.child(1).child(0).text()
    let price = row.child(2).text()
    console.log('上周期结果', time, amount, price)
    return { time, amount, price }
}

const START_X = 120
const END_X = 1008
const CHART_Y = 1330

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// 获取当前月份的天数
let now = new Date();
let daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());

let data = []

function doRecordOneDay() {
    let dateControl = textMatches(/^(\d)+月(\d)+日用电量$/).findOne()
    let dateText = dateControl.text()
    let match = dateText.match(/(\d)+月(\d)+日/)
    let date = match[0]
    // let date = match[1] + '-' + match[2]
    let parent = dateControl.parent()
    let usedAmountFeng = getElementNextToText(parent, '峰').text()
    let usedAmountGu = getElementNextToText(parent, '谷').text()
    let amount = getElementNextToText(parent, '(千瓦时)').text()
    console.log('当日结果', date, amount, usedAmountFeng, usedAmountGu)
    data.push({ date, amount, usedAmountFeng, usedAmountGu })
}
  
function recordDaily() {
    let ancur = text('本月累计电量')
    ancur.waitFor()
    sleep(1000)
    let cursor = START_X
    let gap = (END_X - START_X) / daysInMonth

    for (let i = 0; i < daysInMonth; i++) {
        click(cursor, CHART_Y)
        sleep(200)
        try {
            doRecordOneDay()
        } catch (e) { break }
        cursor += gap
    }

    console.log('data', data)
    return data
}

function getYYYYMM() {
    let date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    return year.toString() + (month < 10 ? '-0' : '-') + month.toString()
}

device.wakeUp()

shell("am force-stop " + PKG, true);
sleep(500)
app.launch(PKG)
auto.waitFor()
// sleep(5000)

// if (text('今日不再出现').findOne()) {
//     waitAndClickText('今日不再出现')
//     sleep(300)
//     click(950, 264)
// }

waitAndClickText('上期电费')
// var month = recordMonth()
// waitAndClickText('日用电量')
// waitAndClickText('30天')
var daily = recordDaily()
let feng = 0, gu = 0, total = 0, date = getYYYYMM(), lastDate = "";
for (let i = 0; i < daily.length; i++) {
    feng += parseFloat(daily[i].usedAmountFeng)
    gu += parseFloat(daily[i].usedAmountGu)
    total += parseFloat(daily[i].amount)
    lastDate = daily[i].date
}
http.postJson(WEBHOOK_ID, {
    time: new Date().toISOString(),
    // last_month: month,
    this_month: {
        feng, gu,
        amount: total,
        last_date: lastDate
    }
})
shell("am force-stop " + PKG, true);
