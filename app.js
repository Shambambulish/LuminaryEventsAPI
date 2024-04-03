const express = require('express')
const app = express()
app.use(express.json())

const { getOrders, getOrder, getOrderContents, getUnfinishedOrders, getUnpaidOrders, getOrdersWithLatePayment, getFinishedOrders, getOrdersBeforeTime, getOrdersAfterTime, getOrdersBetweenTimes, getDevices, getDevice, createOrder, createDevice, updateOrder, updateDevice, deleteOrder, deleteDevice } = require('./database.js')

app.listen(3000, () => console.log('Server started on port 3000'))

app.get("/orders", async (req, res) => {
    const orders = await getOrders()
    res.send(orders)
})

app.get("/orders/:id", async (req, res) => {
    const id = req.params.id
    const orders = await getOrder(id)
    res.send(orders)
})

app.get("/orders/:id/contents", async (req, res) => {
    const id = req.params.id
    const orders = await getOrderContents(id)
    res.send(orders)
})

app.get("/orders/unfinished", async (req, res) => {
    const orders = await getUnfinishedOrders()
    res.send(orders)
})

app.get("/orders/unpaid", async (req, res) => {
    const orders = await getUnpaidOrders()
    res.send(orders)
})

app.get("/orders/latepayment", async (req, res) => {
    const orders = await getOrdersWithLatePayment()
    res.send(orders)
})

app.get("/orders/finished", async (req, res) => {
    const orders = await getFinishedOrders()
    res.send(orders)
})

app.get("/orders/before/:time", async (req, res) => {
    const time = req.params.time
    const orders = await getOrdersBeforeTime(time)
    res.send(orders)
})

app.get("/orders/after/:time", async (req, res) => {
    const time = req.params.time
    const orders = await getOrdersAfterTime(time)
    res.send(orders)
})

app.get("/orders/between/:time_a/:time_b", async (req, res) => {
    const time_a = req.params.time_a
    const time_b = req.params.time_b
    const orders = await getOrdersBetweenTimes(time_a, time_b)
    res.send(orders)
})

app.get("/devices", async (req, res) => {
    const devices = await getDevices()
    res.send(devices)
})

app.get("/devices/:id", async (req, res) => {
    const id = req.params.id
    const devices = await getDevice(id)
    res.send(devices)
})

app.post("/orders", async (req, res) => {
    const {total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email, contents} = req.body
    const order = await createOrder(total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email, contents)
    res.status(201).send(order)
})

app.post("/devices", async (req, res) => {
    const {name, description, price_per_day, total_stock} = req.body
    const device = await createDevice(name, description, price_per_day, total_stock)
    res.status(201).send(device)
})

app.put("/orders/:id", async (req, res) => {
    const id = req.params.id
    const {total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email, contents} = req.body
    const order = await updateOrder(id, total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email, contents)
    res.status(201).send(order)
})

app.put("/devices/:id", async (req, res) => {
    const id = req.params.id
    const {name, description, price_per_day, current_stock, total_stock} = req.body
    const device = await updateDevice(id, name, description, price_per_day, current_stock, total_stock)
    res.status(201).send(device)
})

app.delete("/orders/:id", async (req, res) => {
    const id = req.params.id
    await deleteOrder(id)
    res.status(204).send()
})

app.delete("/devices/:id", async (req, res) => {
    const id = req.params.id
    await deleteDevice(id)
    res.status(204).send()
})


app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).send('Something went wrong!')
})

