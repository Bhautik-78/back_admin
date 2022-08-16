import { ExtractJwt } from "passport-jwt";
import configkeys from "./../config";
import { Users } from "./../api/users/users.model";

const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt-nodejs");

// Ceate Local Strategy
const localOptions = {
  usernameField: "email"
};
const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || 4, 10);
const isSecurityLoginEnabled = process.env.ENABLE_SECURITY_LOGIN || "No";

const localLoginNew = new LocalStrategy(
  localOptions,
  async (email, password, done) => {
    // const regexemail = new RegExp(email, "i");
    // console.log("REGEX EMAIL", regexemail);

    // verify the email and password
    try {
      const userInfo = await Users.findOne({
        email: email.toLowerCase()
      });

      if (!userInfo)
        return done("Either password or user ID doesn't match", false);
      if (userInfo.isLocked)
        return done(
          `Your account has been locked for trying maximum invalid attempts. Please check after ${
            process.env.ACC_LOCK_TIME
          } minutes`,
          false
        );
      const { password: userhashedpassword } = userInfo;
      let { loginAttempts } = userInfo;
      const matchStatus = await bcrypt.compareSync(
        password,
        userhashedpassword
      );
      if (!matchStatus) {
        if (isSecurityLoginEnabled === "Yes") {
          if (userInfo.lastInvalidAttempt) {
            await userInfo.resetLoginAttempts();
            loginAttempts = 0;
          }
          const updatedStatus = await userInfo.updateLoginAttempts();
          console.log("Stop HERE");
          if (updatedStatus.isLocked)
            return done(
              `Your account has been locked for trying maximum invalid attempts. Please check after ${process
                .env.ACC_LOCK_TIME || 15} minutes`,
              false
            );
          if (loginAttempts > 1)
            return done(
              `Incorrect credentials. You have ${MAX_ATTEMPTS -
                loginAttempts} attempt(s) left`,
              false
            );
        }
        return done("Either password or user ID doesn't match", false);
      }
      if (loginAttempts > 0) await userInfo.resetLoginAttempts();

      const existingUsers = await Users.aggregate([
        {
          $match: {
            email: email.toLowerCase()
          }
        },
        // {
        //   $addFields: {
        //     canWeAllowThisUser: {
        //       $or: [
        //         {
        //           $eq: ["$userLoginCredentials.onboardingStatus", "Done"]
        //         },
        //         {
        //           $and: [
        //             {
        //               $eq: ["$userLoginCredentials.onboardingStatus", "created"]
        //             },
        //             {
        //               $eq: ["$userLoginCredentials.isUserSTPEligible", true]
        //             }
        //           ]
        //         }
        //       ]
        //     },
        //     userRevisedStatus: {
        //       $ifNull: ["$userStatus", "active"]
        //     }
        //   }
        // },
        // {
        //   $match: {
        //     userRevisedStatus: "active",
        //     canWeAllowThisUser: true
        //   }
        // },
        {
          $project: {
            _id: 1,
            userId: "_id",
            name: 1,
            email: 1,
            mobileNo: 1,
            onboardingStatus: 1
          }
        }
      ]);

      if (existingUsers.length > 0) {
        // Passport assigns this to req.user
        return done(null, existingUsers[0]);
      }
      return done(
        "No user exists with the specified email ID who is active in the system",
        false
      );
    } catch (err) {
      console.log(err);
      return done("System was unable to process the details", false);
    }
  }
);

// Set JWT Options
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader("authorization"),
  secretOrKey: configkeys.secrets.JWT_SECRET
};

const jwtLoginNew = new JwtStrategy(jwtOptions, (payload, done) => {

  // eslint-disable-next-line consistent-return
  Users.aggregate(
    [
      {
        $match: {
          email: {
            $regex: payload.sub,
            $options: "i"
          }
        }
      }
      // {
      //   $addFields: {
      //     canWeAllowThisUser: {
      //       $or: [
      //         {
      //           $eq: ["$userLoginCredentials.onboardingStatus", "Done"]
      //         },
      //         {
      //           $and: [
      //             {
      //               $eq: ["$userLoginCredentials.onboardingStatus", "created"]
      //             },
      //             {
      //               $eq: ["$userLoginCredentials.isUserSTPEligible", true]
      //             }
      //           ]
      //         }
      //       ]
      //     },
      //     userRevisedStatus: {
      //       $ifNull: ["$userStatus", "active"]
      //     }
      //   }
      // },
      // {
      //   $match: {
      //     userRevisedStatus: "active",
      //     canWeAllowThisUser: true
      //   }
      // },
      // {
      //   $lookup: {
      //     from: "applications",
      //     let: { appid: "$applications" },
      //     pipeline: [{ $match: { $expr: { $in: ["$_id", "$$appid"] } } }],
      //     as: "applications"
      //   }
      // }
      /*,
      {
        $project: {
            _id: 1,
            userId: "_id",
            userEntitlement: 1,
            userFirstName: 1,
            userMiddleName: 1,
            userLastName: 1,
            userEmailId: 1,
            canWeAllowThisUser: 1,
            userRevisedStatus: 1,
            userLoginCredentials: 1
        }
      } */
    ],
    (err, user) => {
      // console.log("====existingUsers==========>", user)
      if (err) {
        return done(err, false);
      }
      if (user.length > 0) {
        done(null, user[0]);
      } else {
        done(null, false);
      }
    }
  );
});

// Use JWT Login Details to get the JWT Checklist Login

passport.use(jwtLoginNew);

// Use the Local Login strategy to review the password and user before issuing a
// token
passport.use(localLoginNew);
