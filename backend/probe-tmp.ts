import * as userRepository from "./src/repositories/users";
import { comparePassword } from "./src/services/password";
import { signToken } from "./src/services/token";
import { env } from "./src/config/env";

async function main() {
  try {
    const user = await userRepository.findByEmail("admin");
    const ok = user ? await comparePassword("12345678", user.password_hash) : false;
    console.log("user:", user?.id, "passwordOk:", ok, "jwtSecretSet:", Boolean(env.jwtSecret));
    const token = signToken({ userId: user!.id, email: user!.email });
    console.log("token length:", token.length);
  } catch (err) {
    console.error("PROBE ERR:", (err as Error).stack ?? err);
  }
}
main();
