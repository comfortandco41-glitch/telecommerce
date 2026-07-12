import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../services/categoryService";
import { ValidationError } from "../errors/appError";

export class CategoryController {
  public createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { name, description } = req.body;

      if (!shopId) {
        throw new ValidationError("shopId is required");
      }

      const categoryService = new CategoryService(shopId);
      const category = await categoryService.createCategory({ name, description });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  };

  public getCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { shopId } = req.params;

      if (!shopId) {
        throw new ValidationError("shopId is required");
      }

      const categoryService = new CategoryService(shopId);
      const categories = await categoryService.getCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { shopId, categoryId } = req.params;
      const { name, description, isActive } = req.body;

      if (!shopId || !categoryId) {
        throw new ValidationError("shopId and categoryId are required");
      }

      const categoryService = new CategoryService(shopId);
      const updatedCategory = await categoryService.updateCategory(categoryId, {
        name,
        description,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: updatedCategory,
      });
    } catch (err) {
      next(err);
    }
  };
}
