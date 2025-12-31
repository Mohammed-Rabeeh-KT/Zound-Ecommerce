import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";

const pageNotFound = async (req, res) => {
  try {
    return res.render('page-404')
  } catch (error) {
    res.redirect('/pageNotFound')
  }
}

const getCategoryImage = (catName) => {
  const map = {
    "Headphones": "/images/cat/headphones.png",
    "IEMs": "/images/cat/iems.png",
    "Speaker": "/images/cat/speaker.png",
    "DACs": "/images/cat/dacs.png",
    "Earphones": "/images/cat/earphones.png",
    "Earbuds": "/images/cat/earbuds.png",
    "Hi-Fi Speakers": "/images/cat/hifi-speakers.png",
    "Music Players": "/images/cat/music-players.png",
    "Turntables": "/images/cat/turntables.png",
    "Studio Gear": "/images/cat/studio-gear.png",
    "Wireless Audio": "/images/cat/wireless-audio.png",
    "Accessories": "/images/cat/accessories.png",
    "Gaming Audio": "/images/cat/gaming-audio.png "
  };
  return map[catName] || "/images/cat/accessories.png"; // Default
};


const loadHomepage = async (req, res) => {
  try {
    // 1. Fetch Categories
    const categoryData = await Category.find({ isListed: true });
    const categories = categoryData.map(c => ({
      _id: c._id,
      name: c.name,
      slug : c.slug,
      image: getCategoryImage(c.name)
    }));

    // 2. Fetch Latest Products (New Arrivals)
    const latestProducts = await Product.find({ isDeleted: false, status: 'Active' })
      .populate('category')
      .populate('brand')
      .sort({ createdAt: -1 })
      .limit(8);

    // 3. Fetch Top Selling Products (Using isBestSeller flag or fallback to most viewed/stock)
    let topProducts = await Product.find({ isDeleted: false, status: 'Active', isBestSeller: true })
      .populate('category')
      .populate('brand')
      .limit(8);

    // Fallback if no best sellers defined
    if (topProducts.length === 0) {
      topProducts = await Product.find({ isDeleted: false, status: 'Active' })
        .populate('category')
        .populate('brand')
        .sort({ 'variants.stock': -1 }) // Simple fallback
        .limit(8);
    }



    // 4. Fetch Brands
    const brands = await Brand.find({ isListed: true }).limit(10); 
    
    // const specialOffers = latestProducts.slice(0, 8); // Quick mapping for now

    const processProduct = (product) => {
      const activeVariant = product.variants?.find(
        v => v.status === 'Active' && v.stock > 0
      );

      return {
        ...product.toObject(),
        listingImage:
          activeVariant?.images?.[0] ||
          product.productImages?.[0] ||   
          '/images/placeholder.png',
        primaryVariant: activeVariant
      };
    };

    const latestProductsProcessed = latestProducts.map(processProduct);
    const topProductsProcessed = topProducts.map(processProduct);
    const specialOffersProcessed = latestProducts.map(processProduct);


    res.render("user/home", {
      layout: "layout",
      user: req.user || null,
      cartCount: req.session?.cart?.length || 0,
      categories,
      latestProducts: latestProductsProcessed,
      topProducts: topProductsProcessed,
      brands,
      specialOffers : specialOffersProcessed
    });

  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).render('page-404'); // Or generic error
  }
}


export default {
  loadHomepage,
  pageNotFound
};