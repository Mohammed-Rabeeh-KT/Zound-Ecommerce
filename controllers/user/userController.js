const pageNotFound = async (req, res) => {
    try {
        return res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const loadHomepage = async (req, res) => {
    // try {
    //     return res.render('user/home', {
    //         layout: "layout",
    //         user: req.user || null,
    //         cartCount: req.session?.cart?.length || 0
    //     })
    // } catch (error) {
    //     console.log("Home page not found")
    //     res.status(500).send('Server error')
    // }
    
  // ----------------------------
  // SHOP BY CATEGORY
  // ----------------------------
//   const categories = [
//     { name: "Headphones", image: "/images/cat/headphones.jpg" },
//     { name: "IEMs", image: "/images/cat/iems.jpg" },
//     { name: "DACs", image: "/images/cat/dacs.jpg" },
//     { name: "Earphones", image: "/images/cat/earphones.jpg" },
//     { name: "Earbuds", image: "/images/cat/earbuds.jpg" },
//     { name: "Home Audio", image: "/images/cat/homeaudio.jpg" },
//     { name: "Accessories", image: "/images/cat/accessories.jpg" },
//     { name: "Amplifiers", image: "/images/cat/amplifiers.jpg" },
//     { name: "Amplifiers", image: "/images/cat/amplifiers.jpg" },
//     { name: "Amplifiers", image: "/images/cat/amplifiers.jpg" },
//     { name: "Amplifiers", image: "/images/cat/amplifiers.jpg" },
//     { name: "Amplifiers", image: "/images/cat/amplifiers.jpg" },



//   ];
const categories = [
  { name: "Headphones",       image: "/images/cat/headphones.png" },
  { name: "IEMs",             image: "/images/cat/iems.png" },
  { name: "DACs & Amps",      image: "/images/cat/dacs-amps.png" },
  { name: "Earphones",        image: "/images/cat/earphones.png" },
  { name: "Earbuds",          image: "/images/cat/earbuds.png" },
  { name: "Hi-Fi Speakers",   image: "/images/cat/hifi-speakers.png" },
  { name: "Music Players",    image: "/images/cat/music-players.png" },
  { name: "Turntables",       image: "/images/cat/turntables.png" },
  { name: "Studio Gear",      image: "/images/cat/studio-gear.png" },
  { name: "Wireless Audio",   image: "/images/cat/wireless-audio.png" },
  { name: "Accessories",      image: "/images/cat/accessories.png" },
  { name: "Gaming Audio",     image: "/images/cat/gaming-audio.png " }
];


  // ----------------------------
  // TOP SELLING PRODUCTS
  // ----------------------------
  const topProducts = [
    {
      _id: "1",
      name: "Sennheiser HD 800 S",
      brand: "Sennheiser",
      price: 139999,
      oldPrice: 149999,
      discount: 7,
      image: "/images/products/hd800s.jpg"
    },
    {
      _id: "2",
      name: "Focal Utopia",
      brand: "Focal",
      price: 442999,
      oldPrice: 449999,
      discount: 2,
      image: "/images/products/utopia.jpg"
    },
    {
      _id: "3",
      name: "Audeze LCD-5",
      brand: "Audeze",
      price: 345000,
      oldPrice: 449000,
      discount: 10,
      image: "/images/products/lcd5.jpg"
    },
    {
      _id: "4",
      name: "HiFiMan Susvara",
      brand: "HiFiMan",
      price: 409999,
      oldPrice: 459999,
      discount: 10,
      image: "/images/products/susvara.jpg"
    },
    {
      _id: "5",
      name: "Campfire Audio Andromeda",
      brand: "Campfire Audio",
      price: 104999,
      oldPrice: 114999,
      discount: 8,
      image: "/images/products/andromeda.jpg"
    },
    {
      _id: "6",
      name: "64 Audio U12t",
      brand: "64 Audio",
      price: 169999,
      oldPrice: 184999,
      discount: 8,
      image: "/images/products/u12t.jpg"
    },
    {
      _id: "7",
      name: "ASK EP2300T",
      brand: "ASK Audio",
      price: 24800,
      oldPrice: 44800,
      discount: 44,
      image: "/images/products/ask-ep2300.jpg"
    },
    {
      _id: "8",
      name: "KEF LS50 Wireless II",
      brand: "KEF",
      price: 279950,
      oldPrice: 299950,
      discount: 7,
      image: "/images/products/ls50.jpg"
    }
  ];

  // ----------------------------
  // CURATED BRANDS
  // ----------------------------
  const curatedBrands = [
    "Apple",
    "boAt",
    "Samsung",
    "Sony",
    "Bose",
    "Sennheiser",
    "Focal",
    "Audeze",
    "HiFiMan",
    "All brands"
  ];

  // ----------------------------
  // SPECIAL OFFERS FOR YOU
  // ----------------------------
  const specialOffers = [
    {
      _id: "101",
      name: "Xiaomi Wireless Buds Pro",
      brand: "Xiaomi",
      price: 4999,
      oldPrice: 5799,
      discount: 14,
      image: "/images/products/xiaomi-buds.jpg",
      stock: 112
    },
    {
      _id: "102",
      name: "Sony WH-CH720N",
      brand: "Sony",
      price: 9999,
      oldPrice: 12499,
      discount: 20,
      image: "/images/products/sony-ch720.jpg",
      stock: 45
    },
    {
      _id: "103",
      name: "boAt Bluetooth Speaker",
      brand: "boAt",
      price: 6520,
      oldPrice: 8000,
      discount: 18,
      image: "/images/products/boat-speaker.jpg",
      stock: 13
    },
    {
      _id: "104",
      name: "Sony HeadPhones",
      brand: "Sony",
      price: 29990,
      oldPrice: 31990,
      discount: 7,
      image: "/images/products/sony-headphones.jpg",
      stock: 7
    }
  ];

  res.render("user/home", {
    layout: "layout",
    user: req.user || null,
    cartCount: req.session?.cart?.length || 0,
    categories,
    topProducts,
    curatedBrands,
    specialOffers
  });
}

export default{ 
    loadHomepage,
    pageNotFound
};