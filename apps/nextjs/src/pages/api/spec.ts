import { withSwagger } from 'next-swagger-doc';

import { swaggerOptions } from "lib/swagger";
const swaggerHandler = withSwagger(swaggerOptions);

export default swaggerHandler();