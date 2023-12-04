import { swaggerOptions } from "lib/swagger";
import { withSwagger } from "next-swagger-doc";

const swaggerHandler = withSwagger(swaggerOptions);

export default swaggerHandler();
