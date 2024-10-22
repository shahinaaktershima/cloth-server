const express = require('express');
const SSLCommerzPayment = require("sslcommerz-lts");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app=express();
const port=process.env.PORT||5000;

// middle ware
app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // "https://agro-firm-projects.vercel.app",
      // "https://agro-firm-projects-git-main-shahinaaktershimas-projects.vercel.app",
    ],
    credentials: true,
  })
);


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hfsk54e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
const paymentCollection = client
      .db("productCollection")
      .collection("payment");
    const productCollection=client.db('productCollection').collection('product');
 const userCollection=client.db('userCollection').collection('user');
    app.post('/product',async(req,res)=>{
      const product=req.body;
      console.log(product);
      const result=await productCollection.insertOne(product);
      res.send(result)
    })
 app.get('/product',async(req,res)=>{
  const result=await productCollection.find().toArray();
    res.send(result);
 })
 app.get('/product/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id: new ObjectId(id)}
  const result=await productCollection.findOne(query)
  res.send(result)
 })
 app.delete('/product/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await productCollection.deleteOne(query);
  res.send(result)

})
//  user related api
app.post('/user',async(req,res)=>{
    const user=req.body;
    const query={email:user.email}
    const existingUser=await userCollection.findOne(query)
    if(existingUser){
        return res.send({message:'user already exists', insertedId:null})
    }
    const result=await userCollection.insertOne(user);
    res.send(result)
})

app.get('/user',async(req,res)=>{
    const result=await userCollection.find().toArray();
    res.send(result)
})
app.delete('/user/:id',async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const result=await userCollection.deleteOne(query);
    res.send(result);
  });
  // admin related api
app.get('/user/admin/:email',async(req,res)=>{
  const email = req.params.email;

  const query = { email: email };
  const user = await userCollection.findOne(query);

  res.send(user);
    })
    app.patch('/user/admin/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
      })
// payment
    const trans_id = new ObjectId().toString();
    console.log(trans_id);
    app.post("/payment", async (req, res) => {
      const deposit = req.body;
      console.log(req.body);
      const data = {
        total_amount: deposit.price,
        currency: "BDT",
        tran_id: trans_id,
        success_url: `http://localhost:5000/payment/success/${trans_id}`,
        fail_url: "http://localhost:3030/fail",
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: deposit.name,
        cus_email: "email",
        cus_add1: "Dhaka",
      };
      console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        const finalDeposit = {
          deposit,
          depositStatus: false,
          transactionId: trans_id,
        };
        const result = paymentCollection.insertOne(finalDeposit);
        console.log("Redirecting to: ", GatewayPageURL);
        app.post("/payment/success/:transId", async (req, res) => {
          console.log(req.params.transId);
          const result = await paymentCollection.updateOne(
            { transactionId: req.params.transId },
            {
              $set: {
                depositStatus: true,
              },
            }
          );

          if (result.modifiedCount > 0) {
            res.redirect(
              `http://localhost:5173/dashboard/success/${trans_id}`
            );
          }
        });
      });
      app.get("/paymentsystem", async (req, res) => {
        const cursor = paymentCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      });
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('agro firm is running')
})
app.listen(port,()=>{
    console.log(`agro firm is running on port ${port}`);
})