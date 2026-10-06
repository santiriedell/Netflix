import { Router } from 'express';
import passport from 'passport';
import { getMyList, addToMyList, removeFromMyList } from '../controllers/userController.js';
import { validate } from '../middlewares/validate.js';
import { movieIdSchema } from '../validators/userValidator.js';

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/mylist', requireAuth, getMyList);
router.post('/mylist', requireAuth, validate(movieIdSchema), addToMyList);
router.delete('/mylist/:movieId', requireAuth, validate(movieIdSchema, 'params'), removeFromMyList);

export default router;