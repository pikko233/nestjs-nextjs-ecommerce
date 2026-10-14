import { Category } from "@/types/category.type";
import {
  Product,
  ProductQueryParams,
  ProductResponse,
} from "@/types/product.type";

const TIMESTAMP = "2026-10-01T08:00:00.000Z";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=60`;

const createCategory = (id: string, name: string, slug: string): Category => ({
  id,
  name,
  slug,
  description: `${name}类商品`,
  imageUrl: "",
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
});

const categories = {
  shoes: createCategory("cat-shoes", "鞋履", "shoes"),
  electronics: createCategory("cat-electronics", "数码", "electronics"),
  accessories: createCategory("cat-accessories", "配饰", "accessories"),
  beauty: createCategory("cat-beauty", "美妆", "beauty"),
};

type MockProductInput = Pick<Product, "name" | "price" | "stock"> & {
  image: string;
  category: Category;
  description?: string;
};

const items: MockProductInput[] = [
  {
    name: "Classic Running Sneaker",
    price: 699,
    stock: 32,
    image: "1549298916-b41d501d3772",
    category: categories.shoes,
  },
  {
    name: "Minimalist Wrist Watch",
    price: 1299,
    stock: 12,
    image: "1523275335684-37898b6baf30",
    category: categories.accessories,
  },
  {
    name: "Wireless Over-Ear Headphones",
    price: 899,
    stock: 25,
    image: "1505740420928-5e560c06d30e",
    category: categories.electronics,
  },
  {
    name: "Red Sport Trainer",
    price: 799,
    stock: 0,
    image: "1542291026-7eec264c27ff",
    category: categories.shoes,
  },
  {
    name: "Retro Film Camera",
    price: 2399,
    stock: 5,
    image: "1526170375885-4d8ecf77b99f",
    category: categories.electronics,
  },
  {
    name: "Polarized Sunglasses",
    price: 359,
    stock: 48,
    image: "1572635196237-14b3f281503f",
    category: categories.accessories,
  },
  {
    name: "Everyday Canvas Shoes",
    price: 429,
    stock: 60,
    image: "1491553895911-0055eca6402d",
    category: categories.shoes,
  },
  {
    name: "Eau de Parfum 50ml",
    price: 680,
    stock: 18,
    image: "1585386959984-a4155224a1ad",
    category: categories.beauty,
  },
  {
    name: "Smart Watch Series X",
    price: 1999,
    stock: 9,
    image: "1546868871-7041f2a55e12",
    category: categories.electronics,
  },
  {
    name: "Studio Monitor Headphones",
    price: 1099,
    stock: 14,
    image: "1583394838336-acd977736f90",
    category: categories.electronics,
  },
  {
    name: "Urban Street Sneaker",
    price: 899,
    stock: 21,
    image: "1606107557195-0e29a4b5b4aa",
    category: categories.shoes,
  },
  {
    name: "Travel Backpack",
    price: 459,
    stock: 40,
    image: "1553062407-98eeb64c6a62",
    category: categories.accessories,
  },
  {
    name: "Lightweight Runner",
    price: 749,
    stock: 3,
    image: "1560769629-975ec94e6a86",
    category: categories.shoes,
  },
  {
    name: 'Ultrabook Laptop 14"',
    price: 6999,
    stock: 7,
    image: "1517336714731-489689fd1ca8",
    category: categories.electronics,
  },
  {
    name: "Round Frame Glasses",
    price: 299,
    stock: 35,
    image: "1511499767150-a48a237f0083",
    category: categories.accessories,
  },
  {
    name: "Workspace Essentials Set",
    price: 199,
    stock: 50,
    image: "1434389677669-e08b4cac3105",
    category: categories.accessories,
  },
  {
    name: "Hydrating Skincare Kit",
    price: 329,
    stock: 27,
    image: "1598033129183-c4f50c736f10",
    category: categories.beauty,
  },
  {
    name: "Glow Serum 30ml",
    price: 259,
    stock: 0,
    image: "1608043152269-423dbba4e7e1",
    category: categories.beauty,
  },
];

export const mockProducts: Product[] = items.map((item, index) => {
  const no = String(index + 1).padStart(3, "0");
  return {
    id: `mock-product-${no}`,
    name: item.name,
    description: item.description ?? `${item.name}，品质之选。`,
    price: item.price,
    stock: item.stock,
    sku: `SKU-${item.category.slug.toUpperCase()}-${no}`,
    imageUrl: unsplash(item.image),
    isActive: true,
    category: item.category,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
});

// 模拟 GET /product 的分页与筛选行为
export const getMockProducts = async (
  params: ProductQueryParams = {},
): Promise<ProductResponse> => {
  const { page = 1, limit = 10, search, category } = params;
  await new Promise((resolve) => setTimeout(resolve, 400));

  const keyword = search?.trim().toLowerCase();
  const filtered = mockProducts.filter(
    (product) =>
      (!keyword || product.name.toLowerCase().includes(keyword)) &&
      (!category || product.category.id === category),
  );

  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    meta: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
};
