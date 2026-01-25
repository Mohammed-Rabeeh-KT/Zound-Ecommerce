import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { successResponse, STATUS } from "../../utils/response.js";

const escapeRegExp = (str = "") => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  const finalProductName = (name || productName || "").trim();
  if (!finalProductName) {
    return next(new AppError("Product name is required", 400));
  }

  const duplicateProduct = await Product.findOne({
    productName: { $regex: new RegExp(`^${escapeRegExp(finalProductName)}$`, "i") },
    isDeleted: false
  });
  if (duplicateProduct) {
    return next(new AppError("Product already exists", STATUS.CONFLICT));
  }

  const [brandExists, categoryExists] = await Promise.all([
    Brand.exists({ _id: brand }),
    Category.exists({ _id: category })
  ]);
  if (!brandExists) return next(new AppError("Brand not found", STATUS.BAD_REQUEST));
  if (!categoryExists) return next(new AppError("Category not found", STATUS.BAD_REQUEST));

  const mainImages = (req.files || []).filter(f => f.fieldname === 'images');
  const variantFiles = (req.files || []).filter(f => f.fieldname.startsWith('variantImage_'));

  const imagePaths = mainImages.map(file => `/uploads/products/${file.filename}`);

  if (imagePaths.length < 1) {
    return next(new AppError("Please upload at least one product image", STATUS.BAD_REQUEST));
  }

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

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return next(new AppError("Please add at least one variant", STATUS.BAD_REQUEST));
    }

    parsedVariants = parsedVariants.map(v => {
      const basePrice = Number(v.basePrice);
      const salePriceRaw = v.salePrice;
      const salePrice = (salePriceRaw === undefined || salePriceRaw === null || String(salePriceRaw).trim() === '')
        ? basePrice
        : Number(salePriceRaw);

      const images = Array.isArray(v.images) ? v.images : [];

      return {
        ...v,
        basePrice,
        salePrice,
        images
      };
    });

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

  if (parsedFeatures.filter(f => String(f).trim()).length === 0) {
    return next(new AppError("Please add at least one feature", STATUS.BAD_REQUEST));
  }

  for (let i = 0; i < parsedVariants.length; i++) {
    const v = parsedVariants[i];

    if (!Number.isFinite(v.basePrice) || v.basePrice <= 0) {
      return next(new AppError(`Variant #${i + 1}: Base price is required and must be greater than 0`, STATUS.BAD_REQUEST));
    }
    if (!Number.isFinite(v.salePrice) || v.salePrice < 0) {
      return next(new AppError(`Variant #${i + 1}: Selling price must be a valid number`, STATUS.BAD_REQUEST));
    }
    if (v.salePrice > v.basePrice) {
      return next(new AppError(`Variant #${i + 1}: Selling price cannot be greater than base price`, STATUS.BAD_REQUEST));
    }

    const imgCount = Array.isArray(v.images) ? v.images.length : 0;
    if (imgCount < 3) {
      return next(new AppError(`Variant #${i + 1}: Please upload at least 3 images`, STATUS.BAD_REQUEST));
    }
  }

  // 5. Create Product
  const newProduct = new Product({
    productName: finalProductName,
    brand,
    category,
    description,
    features: parsedFeatures,
    variants: parsedVariants,
    status: status || 'Active', // Default to Active if status is not provided
    productImages: imagePaths
  });

  await newProduct.save();
  return successResponse(res, STATUS.CREATED, "Product created successfully", newProduct);
});

const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('category').populate('brand');
  if (!product) return next(new AppError("Product not found", 404));

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
    status,
    existingImages
  } = req.body;

  const product = await Product.findById(id);
  if (!product) return next(new AppError("Product not found", 404));

  const originalProductImages = Array.isArray(product.productImages) ? [...product.productImages] : [];

  const normalizedName = (productName ?? product.productName ?? "").trim();
  if (!normalizedName) {
    return next(new AppError("Product name is required", STATUS.BAD_REQUEST));
  }

  const duplicate = await Product.findOne({
    productName: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
    isDeleted: false,
    _id: { $ne: id }
  });
  if (duplicate) {
    return next(new AppError("Product name already taken", STATUS.CONFLICT));
  }

  // Separate files
  let mainImages = [];
  let variantFiles = [];
  if (req.files && req.files.length > 0) {
    mainImages = req.files.filter(f => f.fieldname === 'images');
    variantFiles = req.files.filter(f => f.fieldname.startsWith('variantImage_'));
  }

  // Keep existing common images if not explicitly provided (variant-only update)
  let keptImages = [];
  if (existingImages !== undefined) {
    keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
  } else {
    keptImages = originalProductImages;
  }

  const newImagePaths = mainImages.map(file => `/uploads/products/${file.filename}`);
  const nextProductImages = [...keptImages, ...newImagePaths];
  if (nextProductImages.length < 1) {
    return next(new AppError("Please keep/upload at least one product image", STATUS.BAD_REQUEST));
  }

  // Parse variants
  let parsedVariants = [];
  try {
    parsedVariants = variants ? JSON.parse(variants) : (product.variants || []);
  } catch (e) {
    return next(new AppError("Invalid variants format", STATUS.BAD_REQUEST));
  }

  if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
    return next(new AppError("Please add at least one variant", STATUS.BAD_REQUEST));
  }

  parsedVariants = parsedVariants.map(v => {
    const basePrice = Number(v.basePrice);
    const salePriceRaw = v.salePrice;
    const salePrice = (salePriceRaw === undefined || salePriceRaw === null || String(salePriceRaw).trim() === '')
      ? basePrice
      : Number(salePriceRaw);
    const images = Array.isArray(v.images) ? v.images : [];

    return {
      ...v,
      basePrice,
      salePrice,
      images
    };
  });

  // Apply new variant images
  variantFiles.forEach(file => {
    const index = parseInt(file.fieldname.split('_')[1]);
    if (parsedVariants[index]) {
      if (!parsedVariants[index].images) parsedVariants[index].images = [];
      parsedVariants[index].images.push(`/uploads/products/${file.filename}`);
    }
  });

  for (let i = 0; i < parsedVariants.length; i++) {
    const v = parsedVariants[i];
    if (!Number.isFinite(v.basePrice) || v.basePrice <= 0) {
      return next(new AppError(`Variant #${i + 1}: Base price is required and must be greater than 0`, STATUS.BAD_REQUEST));
    }
    if (!Number.isFinite(v.salePrice) || v.salePrice < 0) {
      return next(new AppError(`Variant #${i + 1}: Selling price must be a valid number`, STATUS.BAD_REQUEST));
    }
    if (v.salePrice > v.basePrice) {
      return next(new AppError(`Variant #${i + 1}: Selling price cannot be greater than base price`, STATUS.BAD_REQUEST));
    }
    const imgCount = Array.isArray(v.images) ? v.images.length : 0;
    if (imgCount < 3) {
      return next(new AppError(`Variant #${i + 1}: Please keep/upload at least 3 images`, STATUS.BAD_REQUEST));
    }
  }

  // Parse features if provided
  let parsedIncomingFeatures = null;
  if (features !== undefined) {
    try {
      parsedIncomingFeatures = JSON.parse(features);
    } catch (e) {
      return next(new AppError("Invalid features format", STATUS.BAD_REQUEST));
    }
  }

  // Server-side no-change detection
  const compareVariants = (arr) => (arr || []).map(v => ({
    type: (v.type || '').trim(),
    value: (v.value || '').trim(),
    basePrice: Number(v.basePrice),
    salePrice: Number(v.salePrice),
    stock: Number(v.stock),
    images: Array.isArray(v.images) ? [...v.images].sort() : []
  }));

  const hasNewMainImages = mainImages.length > 0;
  const hasNewVariantImages = variantFiles.length > 0;
  const nextImagesKey = nextProductImages.join('|');
  const baselineImagesKey = originalProductImages.join('|');

  const baselineFeatures = Array.isArray(product.features) ? product.features : [];
  const baselineVariants = Array.isArray(product.variants) ? product.variants : [];

  const noChangesDetected =
    !hasNewMainImages &&
    !hasNewVariantImages &&
    normalizedName === (product.productName || '').trim() &&
    (description === undefined || description === product.description) &&
    (status === undefined || status === product.status) &&
    (brand === undefined || String(brand) === String(product.brand)) &&
    (category === undefined || String(category) === String(product.category)) &&
    (parsedIncomingFeatures === null || JSON.stringify(parsedIncomingFeatures) === JSON.stringify(baselineFeatures)) &&
    JSON.stringify(compareVariants(parsedVariants)) === JSON.stringify(compareVariants(baselineVariants)) &&
    nextImagesKey === baselineImagesKey;

  if (noChangesDetected) {
    return next(new AppError("No changes made", STATUS.BAD_REQUEST));
  }

  // Apply updates
  product.productImages = nextProductImages;
  product.variants = parsedVariants;
  product.productName = normalizedName;

  if (brand !== undefined) {
    const brandExists = await Brand.exists({ _id: brand });
    if (!brandExists) return next(new AppError("Brand not found", STATUS.BAD_REQUEST));
    product.brand = brand;
  }
  if (category !== undefined) {
    const categoryExists = await Category.exists({ _id: category });
    if (!categoryExists) return next(new AppError("Category not found", STATUS.BAD_REQUEST));
    product.category = category;
  }
  if (description !== undefined) product.description = description;
  if (status !== undefined) product.status = status;
  if (parsedIncomingFeatures !== null) product.features = parsedIncomingFeatures;

  if (!product.features || product.features.filter(f => String(f).trim()).length === 0) {
    return next(new AppError("Please add at least one feature", STATUS.BAD_REQUEST));
  }

  await product.save();
  return successResponse(res, STATUS.OK, "Product updated successfully", product);
});

const toggleProductStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  product.status = product.status === 'Active' ? 'Inactive' : 'Active';
  await product.save();

  return successResponse(res, 200, `Product ${product.status} successfully`, { status: product.status });
});

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