import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CustomerRepository } from "../repositories/customerRepository";

const customerRepo = new CustomerRepository();

export async function handleGetCustomers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  try {
    const customers = await customerRepo.listByShopId(shopId);
    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (err) {
    next(err);
  }
}
