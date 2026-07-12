import { Request, Response, NextFunction } from "express";
import { ProductService } from "../services/productService";
import { ValidationError } from "../errors/appError";

export class ProductController {
  public createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { categoryId, name, description, price, stock, images } = req.body;

      if (!shopId) {
        throw new ValidationError("shopId is required");
      }

      const productService = new ProductService(shopId);
      const product = await productService.createProduct({
        categoryId,
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        images,
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  };

  public getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { categoryId } = req.query;

      if (!shopId) {
        throw new ValidationError("shopId is required");
      }

      const productService = new ProductService(shopId);
      let products;

      if (categoryId && typeof categoryId === "string") {
        products = await productService.getActiveProductsByCategory(categoryId);
      } else {
        products = await productService.getProducts();
      }

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shopId, productId } = req.params;
      const { categoryId, name, description, price, stock, images, isActive } = req.body;

      if (!shopId || !productId) {
        throw new ValidationError("shopId and productId are required");
      }

      const productService = new ProductService(shopId);
      const updatedProduct = await productService.updateProduct(productId, {
        categoryId,
        name,
        description,
        price: price !== undefined ? Number(price) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        images,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: updatedProduct,
      });
    } catch (err) {
      next(err);
    }
  };
}
