import mysql from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()

async function getContents(stuff){
    for (const row of stuff) {
        const [contents] = await pool.query(
            'SELECT devices.name, devices.description, devices.price_per_day, count FROM order_contents INNER JOIN devices ON order_contents.device_id = devices.id AND order_contents.order_id = ?', [row.id])
        row.contents = contents
    }
}

export async function getOrders() {
    const [rows] = await pool.query('SELECT * FROM orders')
    await getContents(rows)
    return rows
}

export async function getOrder(id) {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
    await getContents(rows)
    return rows[0]
}

export async function getOrderContents(id) {
    const [rows] = await pool.query(
        'SELECT devices.name, devices.description, devices.price_per_day, count FROM order_contents INNER JOIN devices ON order_contents.device_id = devices.id AND order_contents.order_id = ?', [id])
    await getContents(rows)
    return rows
}

export async function getUnfinishedOrders() {
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_status <> "resolved"')
    await getContents(rows)
    return rows
}

export async function getUnpaidOrders() {
    const [rows] = await pool.query('SELECT * FROM orders WHERE payment_resolved = 0')
    await getContents(rows)
    return rows
}

export async function getOrdersWithLatePayment() {
    const [rows] = await pool.query('SELECT * FROM orders WHERE payment_resolved = 0 AND payment_due_date < NOW()')
    await getContents(rows)
    return rows
}

export async function getFinishedOrders() {
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_status = "resolved"')
    await getContents(rows)
    return rows
}

export async function getOrdersBeforeTime(time) {
    const timeToSQLFormat = new Date(Date.parse(time)).toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_start_date < ?', [timeToSQLFormat])
    await getContents(rows)
    return rows
}

export async function getOrdersAfterTime(time) {
    const timeToSQLFormat = new Date(Date.parse(time)).toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_end_date > ?', [timeToSQLFormat])
    await getContents(rows)
    return rows
}

export async function getOrdersBetweenTimes(time_a, time_b) {
    const timeAToSQLFormat = new Date(time_a).toISOString().slice(0, 19).replace('T', ' ');
    const timeBToSQLFormat = new Date(time_b).toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_start_date > ? AND order_start_date < ? OR order_end_date > ? AND order_end_date < ?', [timeAToSQLFormat, timeBToSQLFormat, timeAToSQLFormat, timeBToSQLFormat])
    await getContents(rows)
    return rows
}

export async function getDevices() {
    const [rows] = await pool.query('SELECT * FROM devices')
    return rows
}

export async function getDevice(id) {
    const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [id])
    return rows[0]
}

export async function createOrder(total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email, contents = []) {
    const [result] = await pool.query(`
    INSERT INTO orders (total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [total_price, order_start_date, order_length_days, order_end_date, payment_due_date, customer_name, customer_phone_number, customer_email])
    const id = result.insertId

    if (contents.length > 0) {
        for (const content of contents) {
            await pool.query(`
            INSERT INTO order_contents (order_id, device_id, count)
            VALUES (?, ?, ?)
            `, [id, content.device_id, content.count])
        }
    }
    return getOrder(id)
}

export async function createDevice(name, description = null, price_per_day, total_stock) {
    const [result] = await pool.query(`
    INSERT INTO devices (name, description, price_per_day, current_stock, total_stock)
    VALUES (?, ?, ?, ?, ?)
    `, [name, description, price_per_day, total_stock, total_stock])
    const id = result.insertId
    return getDevice(id)
}

export async function updateOrder(id, total_price = null, order_start_date = null, order_length_days = null, order_end_date = null, payment_due_date = null, customer_name = null, customer_phone_number = null, customer_email = null, contents = null) {
    const order = await getOrder(id)
    
    const newOrder = {
        total_price: total_price == null ? order.total_price : total_price,
        order_start_date: order_start_date || order.order_start_date,
        order_length_days: order_length_days || order.order_length_days,
        order_end_date: order_end_date || order.order_end_date,
        payment_due_date: payment_due_date || order.payment_due_date,
        customer_name: customer_name || order.customer_name,
        customer_phone_number: customer_phone_number || order.customer_phone_number,
        customer_email: customer_email || order.customer_email
    }
    
    await pool.query(`
    UPDATE orders
    SET total_price = ?, order_start_date = ?, order_length_days = ?, order_end_date = ?, payment_due_date = ?, customer_name = ?, customer_phone_number = ?, customer_email = ?
    WHERE id = ?
    `, [newOrder.total_price, newOrder.order_start_date, newOrder.order_length_days, newOrder.order_end_date, newOrder.payment_due_date, newOrder.customer_name, newOrder.customer_phone_number, newOrder.customer_email, id])

    if (contents) {
        await pool.query(`
        DELETE FROM order_contents
        WHERE order_id = ?
        `, [id])

        for (const content of contents) {
            await pool.query(`
            INSERT INTO order_contents (order_id, device_id, count)
            VALUES (?, ?, ?)
            `, [id, content.device_id, content.count])
        }
    }
    
    return getOrder(id)
}

export async function updateDevice(id, name = null, description = null, price_per_day = null, current_stock = null, total_stock = null) {
    const device = await getDevice(id)

    const newDevice = {
        name: name || device.name,
        description: description || device.description,
        price_per_day: price_per_day == null ? device.price_per_day : price_per_day,
        current_stock: current_stock == null ? device.current_stock : current_stock,
        total_stock: total_stock == null ? device.total_stock : total_stock
    }
    
    await pool.query(`
    UPDATE devices
    SET name = ?, description = ?, price_per_day = ?, current_stock = ?, total_stock = ?
    WHERE id = ?
    `, [newDevice.name, newDevice.description, newDevice.price_per_day, newDevice.current_stock, newDevice.total_stock, id])
    
    return getDevice(id)
}

export async function deleteOrder(id) {
    await pool.query(`
        DELETE FROM order_contents
        WHERE order_id = ?
        `, [id])
    await pool.query(`
    DELETE FROM orders
    WHERE id = ?
    `, [id])

    return true
}

export async function deleteDevice(id) {
    await pool.query(`
    DELETE FROM order_contents
    WHERE device_id = ?
    `, [id])

    await pool.query(`
    DELETE FROM devices
    WHERE id = ?
    `, [id])

    return true
}