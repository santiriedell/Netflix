import { Router } from 'express';
import { signUp, signIn } from '../controllers/userController.js';
import { validate } from '../middlewares/validate.js';
import { signUpSchema, signInSchema } from '../validators/userValidator.js';

const router = Router();

router.post('/signup', validate(signUpSchema), signUp);
router.post('/signin', validate(signInSchema), signIn);

export default router;