import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";
import appConfig from "./config";

mongoose.Promise = global.Promise;
mongoose.plugin(timestamps);

export const connect = (config = appConfig) => {
  mongoose.set("useCreateIndex", true);
  mongoose.set("useNewUrlParser", true);
  mongoose.set("useFindAndModify", false);
  mongoose.connect(
    config.db.url,
    { useUnifiedTopology: true }
  );
};
