import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { successResponse, STATUS } from "../../utils/response.js";


// RENDER PAGES
const getProductPage = catchAsync(async (req, res) => {
  // Determine filters from query
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };
  if (req.query.search) {
    query.productName = { $regex: req.query.search, $options: "i" };
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.status) {
    query.status = req.query.status === 'active' ? 'Active' : 'Inactive';
  }

  const totalProducts = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category')
    .populate('brand')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const categories = await Category.find({ isListed: true });
  const brands = await Brand.find({ isListed: true });

  res.render("admin/productManagement", {
    currentPage: "products",
    adminName: req.session.admin?.name || "Admin",
    products,
    categories,
    brands,
    totalPages: Math.ceil(totalProducts / limit),
    currentPageNum: page,
    // Pass query params back to keep filter state
    filters: req.query
  });
});

const getProductDetailsPage = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category')
    .populate('brand');

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const categories = await Category.find({ isListed: true });
  const brands = await Brand.find({ isListed: true });

  res.render("admin/productDetails", {
    currentPage: "products",
    adminName: req.session.admin?.name || "Admin",
    product,
    categories,
    brands
  });
});

// ==========================================
// API / ACTIONS
// ==========================================

const addProduct = catchAsync(async (req, res, next) => {
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);

  const {
    name, // Frontend sends 'name', not 'productName'
    productName, // Fallback for backward compatibility
    brand,
    category,
    description,
    status
  } = req.body;

  // Explicit Validation Check
  if (!brand || !category) {
    return next(new AppError("Brand and Category are required", 400));
  }

  // Use 'name' if available, otherwise fall back to 'productName'
  const finalProductName = name || productName;
  if (!finalProductName) {
    return next(new AppError("Product name is required", 400));
  }

  const mainImages = req.files.filter(f => f.fieldname === 'images');
  const variantFiles = req.files.filter(f => f.fieldname.startsWith('variantImage_'));

  const imagePaths = mainImages.map(file => `/uploads/products/${file.filename}`);

  // 2. Parse Features - handle both array and JSON string
  let parsedFeatures = [];
  if (req.body['features[]']) {
    // Frontend sends features[] as array
    parsedFeatures = Array.isArray(req.body['features[]'])
      ? req.body['features[]']
      : [req.body['features[]']];
  } else if (req.body.features) {
    // Fallback: JSON string
    try {
      parsedFeatures = JSON.parse(req.body.features);
    } catch (e) {
      parsedFeatures = [];
    }
  }

  // 3. Parse Variants - handle JSON string or array
  let parsedVariants = [];
  try {
    if (req.body.variants) {
      parsedVariants = typeof req.body.variants === 'string'
        ? JSON.parse(req.body.variants)
        : req.body.variants;
    }

    // Map Variant Images
    variantFiles.forEach(file => {
      const index = parseInt(file.fieldname.split('_')[1]);
      if (parsedVariants[index]) {
        if (!parsedVariants[index].images) parsedVariants[index].images = [];
        parsedVariants[index].images.push(`/uploads/products/${file.filename}`);
      }
    });

  } catch (e) {
    return next(new AppError("Invalid variants format", 400));
  }

  // 4. Validation: Product must have images
  if (imagePaths.length === 0 && parsedVariants.every(v => !v.images || v.images.length === 0)) {
    return next(new AppError("Product must have at least one image (common or variant-specific)", 400));
  }

  // 5. Create Product
  const newProduct = new Product({
    productName: finalProductName,
    brand,
    category,
    description,
    productImages: imagePaths,
    features: parsedFeatures,
    variants: parsedVariants,
    status: status || "Active"
  });

  await newProduct.save();

  return successResponse(res, STATUS.CREATED, "Product created successfully", newProduct);

})

const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('category').populate('brand');
  if (!product)
    return next(new AppError("Product not found", 404));

  return successResponse(res, STATUS.OK, "Product details", product);
});

const updateProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const {
    productName,
    brand,
    category,
    description,
    features,
    variants,
    status, // Extract status
    existingImages // info about kept images
  } = req.body;

  const product = await Product.findById(id);
  if (!product)
    return next(new AppError("Product not found", 404));

  // Handle Images & Variants
  // 1. Separate Files
  let mainImages = [];
  let variantFiles = [];

  if (req.files && req.files.length > 0) {
    mainImages = req.files.filter(f => f.fieldname === 'images');
    variantFiles = req.files.filter(f => f.fieldname.startsWith('variantImage_'));
  }

  // 2. Handle Common Product Images
 let keptImages;

if (existingImages !== undefined) {
  keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
} else {
  keptImages = product.productImages || [];
}

  let newImagePaths = [];
  
  if (mainImages.length > 0) {
    newImagePaths = mainImages.map(file => `/uploads/products/${file.filename}`);
  }

  // Combine kept images + new images
  product.productImages = [...keptImages, ...newImagePaths];

  // 3. Handle Variants & Variant Images
  // We need to base upgrades on provided 'variants' JSON or fallback to existing
  let parsedVariants = [];

  if (variants) {
    try {
      parsedVariants = JSON.parse(variants);
    } catch (e) {
      return next(new AppError("Invalid variants format", 400));
    }
  } else {
    parsedVariants = product.variants || [];
  }

  // Apply new variant images
  variantFiles.forEach(file => {
    const index = parseInt(file.fieldname.split('_')[1]);
    if (parsedVariants[index]) {
      if (!parsedVariants[index].images)
        parsedVariants[index].images = [];
      parsedVariants[index].images.push(`/uploads/products/${file.filename}`);
    }
  });

  product.variants = parsedVariants;

  // Update other fields
  if (productName)
    product.productName = productName;
  if (brand)
    product.brand = brand;
  if (category)
    product.category = category;
  if (description)
    product.description = description;
  if (status)
    product.status = status;

  if (features) {
    try {
      product.features = JSON.parse(features);
    } catch (e) {
      return next(new AppError("Invalid features format", 400));
    }
  }

  await product.save();

  return successResponse(res, STATUS.OK, "Product updated successfully", product);

});


const toggleProductStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

  const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';

    await Product.findByIdAndUpdate(id, { status: newStatus });

    return successResponse(res, STATUS.OK, `Product ${newStatus}`, { status: newStatus });
})


const softDeleteProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

    await Product.findByIdAndUpdate(id, { isDeleted: true });

    return successResponse(res, STATUS.OK, "Product deleted");
});

const deleteVariant = catchAsync(async (req, res, next) => {
    const { productId, variantId } = req.body;
    await Product.updateOne({ _id: productId }, { $pull: { variants: { _id: variantId } } });
    return successResponse(res, STATUS.OK, "Variant deleted successfully");
});

const toggleVariantStatus = catchAsync(async (req, res, next) => {
    const { productId, variantId, status } = req.body;
    // status should be 'Active' or 'Inactive'
    await Product.updateOne(
        { _id: productId, "variants._id": variantId },
        { $set: { "variants.$.status": status } }
    );
    return successResponse(res, STATUS.OK, "Variant status updated");
});

export default {
    getProductPage,
    getProductDetailsPage,
    addProduct,
    getProductById,
    updateProduct,
    toggleProductStatus,
    softDeleteProduct,
    deleteVariant,
    toggleVariantStatus
};