import 'dotenv/config';
import { createApp } from './app.js';
import { BlackboardService } from './services/blackboard.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const blackboardService = new BlackboardService();
const app = createApp();
app.locals.blackboard = blackboardService;

app.listen(PORT, () => {
  console.log(`blackboard service started on port ${PORT}`);
});
