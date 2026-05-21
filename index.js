const express = require('express')
const app = express()
app.use(express.json())

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === 'replymate123') {
    res.send(req.query['hub.challenge'])
  } else {
    res.sendStatus(403)
  }
})

app.post('/webhook', (req, res) => {
  console.log('Mesaj geldi:', JSON.stringify(req.body, null, 2))
  res.sendStatus(200)
})

app.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor')
})
