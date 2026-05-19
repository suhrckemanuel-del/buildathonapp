// Azure Functions v4 entry point — imports each function file so its
// `app.http(...)` registration runs at startup.
// create-group is intentionally NOT a public HTTP endpoint (Sentinel F3);
// it's invoked internally by match-users via createGroupCore.
import './match-users';
import './search-groups';
import './letterboxd-import';
import './embed-profile';
