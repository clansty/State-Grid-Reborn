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

function recordDaily() {
    let ancur = text('电量(千瓦时)')
    ancur.waitFor()
    sleep(1000)
    let parent = ancur.findOne().parent()
    let data = []
    // swipeUp()
    let days = getAllElementNextToText(parent, '尖用电：0', 4)
    days.unshift(getElementBeforeText(parent, '尖用电：0'))

    let count = 0
    while (true) {
        let currentActiveRow = days[count]
        let date = currentActiveRow.child(0).text()
        let amount = currentActiveRow.child(1).text()
        let usedAmountFeng = textStartsWith('峰用电：').findOne().text().substring(4)
        let usedAmountGu = textStartsWith('谷用电：').findOne().text().substring(4)
        console.log('当日结果', date, amount, usedAmountFeng, usedAmountGu)
        data.push({ date, amount, usedAmountFeng, usedAmountGu })
        if (count % 5 === 0) {
            // swipeUp()
        }
        count++
        let nextDay = days[count]
        let nextDayDate = nextDay.child(0).text()
        console.log('nextDay', count, nextDayDate)
        // while (processedDays.includes(nextDayDate)) {
        //     count++
        //     nextDay = nextDays[count]
        //     nextDayDate = nextDay.child(0).text()
        // }
        // 温馨提示
        if (nextDay.childCount() != 3) break;
        nextDay.click()
        sleep(1000);
        // home()
        // sleep(1000);
        // app.launch("com.sgcc.wsgw.cn")
        // sleep(1000);
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
var month = recordMonth()
waitAndClickText('日用电量')
waitAndClickText('30天')
var daily = recordDaily()
let feng = 0, gu = 0, total = 0, date = getYYYYMM(), lastDate = "";
for (let i = 0; i < daily.length; i++) {
    if (!daily[i].date.startsWith(getYYYYMM() + '-')) continue;
    feng += parseFloat(daily[i].usedAmountFeng)
    gu += parseFloat(daily[i].usedAmountGu)
    total += parseFloat(daily[i].amount)
    lastDate = daily[i].date
}
http.postJson(WEBHOOK_ID, {
    time: new Date().toISOString(),
    last_month: month,
    this_month: {
        feng, gu,
        amount: total,
        last_date: lastDate
    }
})
shell("am force-stop " + PKG, true);
