var API_KEY = "1234"

var express = require('express')
var router = express.Router();
const { poolPromise, sql} = require('../db')

router.get('/', function (req, res) {
	res.end("API RUNNING");
}); 

//=============
// USER TABLE
// POST  / GET
//=============
router.get('/user', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		var fbid = req.query.fbid;
		if (fbid != null) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('fbid', sql.NVarChar, fbid)
					.query('SELECT userPhone,name,address,fbid FROM [User] where fbid=@fbid')
				if (queryResult.recordset.length > 0) {
					res.end(JSON.stringify({ susscess: true, result: queryResult.recordset }));
				} else {
					res.end(JSON.stringify({ susscess: false, message: "Empty" }));
				}
			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		} else {
			res.end(JSON.stringify({ susscess: false, message: "Missing fbid in query" }));
		}
	}
})

router.post('/user', async (req, res, next) => {
	console.log(req.body)
	if (req.body.key != API_KEY) {
		res.send(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	}
	else {
		var user_phone = req.body.userPhone;
		var user_name = req.body.userName;
		var user_address = req.body.userAddress;
		var fbid = req.body.fbid;

		if (fbid != null) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('UserPhone', sql.NVarChar, user_phone)
					.input('UserName', sql.NVarChar, user_name)
					.input('UserAddress', sql.NVarChar, user_address)
					.input('FBID', sql.NVarChar, fbid)
					.query('IF EXISTS(SELECT * FROM [User] WHERE FBID=@FBID)'
						+ ' UPDATE [User] SET Name=@UserName, Address=@UserAddress WHERE FBID=@FBID'
						+ ' ELSE'
						+ ' INSERT INTO [User](FBID,UserPhone,Name,Address) OUTPUT Inserted.FBID, Inserted.UserPhone, Inserted.Name, Inserted.Address'
						+ ' VALUES(@FBID,@UserPhone,@UserName,@UserAddress)'
					);

				console.log(queryResult); // Debug to see

				if (queryResult.rowsAffected != null) {
					res.send(JSON.stringify({ susscess: true, message: "Success" }))
				}

			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		}
		else {
			res.send(JSON.stringify({ susscess: false, message: "Missing fbid in body of POST request" }));
		}
	}
})

//=============
// RESTAURANT TABLE
// GET
//=============
router.get('/restaurant', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		try {
			const pool = await poolPromise
			const queryResult = await pool.request()
				.query('SELECT id, name, address, phone, lat, lng, userOwner, image, paymentUrl from [Restaurant]')
			if (queryResult.recordset.length > 0) {
				res.end(JSON.stringify({ susscess: true, result: queryResult.recordset }));
			} else {
				res.end(JSON.stringify({ susscess: false, message: "Empty" }));
			}
		}
		catch (err) {
			res.status(500) // Internal Server Error
			res.send(JSON.stringify({ susscess: false, message: err.message }))
		}
	}
})

router.get('/restaurantById', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		var restaurant_id = req.query.restaurantId;
		if (restaurant_id != null) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('RestaurantId', sql.Int, restaurant_id)
					.query('SELECT id, name, address, phone, lat, lng, userOwner, image, paymentUrl from [Restaurant] WHERE id=@RestaurantId ')
				if (queryResult.recordset.length > 0) {
					res.end(JSON.stringify({ susscess: true, result: queryResult.recordset }));
				} else {
					res.end(JSON.stringify({ susscess: false, message: "Empty" }));
				}
			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		}
		else {
			res.send(JSON.stringify({ susscess: false, message: "Missing restaurantId in query" }));
		}
	}
})

router.get('/nearbyrestaurant', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		var user_lat = parseFloat(req.query.lat)
		var user_lng = parseFloat(req.query.lng)
		var distance = parseInt(req.query.distance)
		if (user_lat != Number.NaN && user_lng != Number.NaN) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('lat', sql.Float, user_lat)
					.input('lng', sql.Float, user_lng)
					.input('distance', sql.Int, distance)
					.query('SELECT * FROM(SELECT id,name,address,phone,lat,lng,userOwner,image,paymentUrl,'
						+ 'ROUND(111.045 * DEGREES(ACOS(COS(RADIANS(@lat)) * COS(RADIANS(lat))'
						+ '* COS(RADIANS(lng) - RADIANS(@lng)) + SIN(RADIANS(@lat))'
						+ '* SIN(RADIANS(lat)))),2) AS distance_in_km FROM [Restaurant])tempTable'
						+ ' WHERE distance_in_km < @distance')

				if (queryResult.recordset.length > 0) {
					res.send(JSON.stringify({ susscess: true, result: queryResult.recordset }));
				} else {
					res.send(JSON.stringify({ susscess: false, message: "Empty" }));
				}
			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		}
		else {
			res.end(JSON.stringify({ susscess: false, message: "Missing lat or lng in query" }));
		}
	}
})

//=============
// MENU TABLE
// GET
//=============

router.get('/menu', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		var restaurant_id = req.query.restaurantId;
		if (restaurant_id != null) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('RestaurantId',sql.Int,restaurant_id)
					.query('SELECT id,name,description,image FROM [Menu] WHERE id IN'
						+ '(SELECT menuId FROM [Restaurant_Menu] WHERE restaurantId=@restaurantId)')   
				if (queryResult.recordset.length > 0) {
					res.send(JSON.stringify({ susscess: true, result: queryResult.recordset }));
				} else {
					res.send(JSON.stringify({ susscess: false, message: "Empty" }));
				}
			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		} else {
			res.send(JSON.stringify({ susscess: false, message: "Missing restaurantId in query" }));
		}
	}
})

//=============
// FOOD TABLE
// GET
//=============

router.get('/food', async (req, res, next) => {
	console.log(req.query);
	if (req.query.key != API_KEY) {
		res.end(JSON.stringify({ susscess: false, message: "Wrong API key" }));
	} else {
		var menu_id = req.query.menuId;
		if (menu_id != null) {
			try {
				const pool = await poolPromise
				const queryResult = await pool.request()
					.input('MenuId', sql.Int, menu_id)
					.query('SELECT id,name,description,image,price,isSize,isAddon,discount FROM [Food] WHERE id IN'
					+ '(SELECT foodId FROM [Menu_Food] WHERE menuId=@menuId)')
				if (queryResult.recordset.length > 0) {
					res.send(JSON.stringify({ susscess: true, result: queryResult.recordset }));
				} else {
					res.send(JSON.stringify({ susscess: false, message: "Empty" }));
				}
			}
			catch (err) {
				res.status(500) // Internal Server Error
				res.send(JSON.stringify({ susscess: false, message: err.message }))
			}
		} else {
			res.send(JSON.stringify({ susscess: false, message: "Missing menu in query" }));
		}
	}
})

module.exports = router;