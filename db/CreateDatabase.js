const { Pay, validate } = require("../models/pay.js");
const { Customer, validateCustomer } = require("../models/customer.js");

const storePay = new Pay({
  contractName: "Store Contract",
  category: "store",
  age: "3-6",
  hourlyRate: 15,
  eveningBonus: {
    amount: 2,
    start: "18:00",
    finish: "00:00",
  },
  saturdayBonus: {
    amount: 3,
    start: "13:00",
    finish: "00:00",
  },
  sundayBonus: {
    amount: 15,
    start: "00:00",
    finish: "00:00",
  },
  nightBonus: {
    amount: 2.5,
    start: "00:00",
    finish: "06:00",
  },
});

const restaurantPay = new Pay({
  contractName: "Restaurant Contract",
  category: "restaurant",
  age: "0-2",
  hourlyRate: 11.5,
  eveningBonus: {
    amount: 2,
    start: "18:00",
    finish: "00:00",
  },
  saturdayBonus: {
    amount: 3,
    start: "13:00",
    finish: "00:00",
  },
  sundayBonus: {
    amount: 11.5,
    start: "00:00",
    finish: "00:00",
  },
  nightBonus: {
    amount: 2.5,
    start: "00:00",
    finish: "06:00",
  },
});

async function validateAndSavePays(payObject) {
  try {
    const payObjectData = payObject.toObject();
    const { error } = await validate(payObjectData);
    if (error) {
      console.error("Validation error:", error.details[0].message);
      return;
    }
    return await payObject.save();
  } catch (err) {
    console.error("Error:", err);
  }
}

async function validateAndSaveCustomers(custObj) {
  try {
    const custObjData = custObj.toObject();
    const { error } = await validateCustomer(custObjData);
    if (error) {
      console.error("Validation error:", error.details[0].message);
      return;
    }
    return await custObj.save();
  } catch (err) {
    console.error("Error:", err);
  }
}

async function createDatabase() {
  try {
    const restaurantResult = await validateAndSavePays(restaurantPay);
    console.log("restaurantPay saved:", restaurantResult);

    const storeResult = await validateAndSavePays(storePay);
    console.log("storePay saved:", storeResult);

    const cust1 = new Customer({
      name: "John Smith",
      pay: restaurantResult._id, // Use the ObjectId directly
    });
    const cust2 = new Customer({
      name: "Mosh Hamedani",
      pay: storeResult._id, // Use the ObjectId directly
    });

    const cust1Result = await validateAndSaveCustomers(cust1);
    console.log("customer 1 saved:", cust1Result);
    const cust2Result = await validateAndSaveCustomers(cust2);
    console.log("customer 2 saved:", cust2Result);
  } catch (error) {
    console.error("Error during validation and save:", error);
  }
}

createDatabase();
