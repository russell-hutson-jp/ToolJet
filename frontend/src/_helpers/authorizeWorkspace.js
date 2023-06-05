import { organizationService, authenticationService } from '@/_services';
import {
  appendWorkspaceId,
  getSubpath,
  getWorkspaceIdFromURL,
  stripTrailingSlash,
  pathnameWithoutSubpath,
} from '@/_helpers/utils';

export const authorizeWorkspace = () => {
  if (!isThisExistedRoute()) {
    const workspaceId = getWorkspaceIdFromURL();
    if (workspaceId) {
      authorizeUserAndHandleErrors(workspaceId);
    } else {
      const isApplicationsPath = window.location.pathname.includes('/applications/');
      const appId = isApplicationsPath ? pathnameWithoutSubpath(window.location.pathname).split('/')[2] : null;
      authenticationService
        .validateSession(appId)
        .then(({ current_organization_id }) => {
          updateCurrentSession({
            current_organization_id,
          });
          //get organizations list
          fetchOrganizations(current_organization_id,({ organizations, current_organization_name }) => {
            //check if the page is not switch-workspace, if then redirect to the page
            if (window.location.pathname !== `${getSubpath() ?? ''}/switch-workspace`) {
              authorizeUserAndHandleErrors(current_organization_name, organizations);
            }
          });
        })
        .catch(() => {
          if (!isThisWorkspaceLoginPage(true) && !isApplicationsPath) {
            updateCurrentSession({
              authentication_status: false,
            });
          } else if (isApplicationsPath) {
            updateCurrentSession({
              authentication_failed: true,
              load_app: true,
            });
          }
        });
    }
  }
};

const isThisExistedRoute = () => {
  const existedPaths = [
    'forgot-password',
    'reset-password',
    'invitations',
    'organization-invitations',
    'setup',
    'confirm',
    'confirm-invite',
  ];

  const subpath = getSubpath();
  const subpathArray = subpath ? subpath.split('/').filter((path) => path != '') : [];
  const pathnames = window.location.pathname.split('/')?.filter((path) => path != '');
  const checkPath = () => existedPaths.find((path) => pathnames[subpath ? subpathArray.length : 0] === path);
  return pathnames?.length > 0 ? (checkPath() ? true : false) : false;
};

const fetchOrganizations = (current_organization_id, callback) => {
  organizationService.getOrganizations().then((response) => {
    const current_organization_name = response.organizations.find((org) => org.id === current_organization_id)?.name;
    callback({ organizations: response.organizations, current_organization_name });
  });
};

const isThisWorkspaceLoginPage = (justLoginPage = false) => {
  const subpath = window?.public_config?.SUB_PATH ? stripTrailingSlash(window?.public_config?.SUB_PATH) : null;
  const pathname = location.pathname.replace(subpath, '');
  const pathnames = pathname.split('/').filter((path) => path !== '');
  return (justLoginPage && pathnames.includes('login')) || (pathnames.length === 2 && pathnames.includes('login'));
};

const updateCurrentSession = (newSession) => {
  const currentSession = authenticationService.currentSessionValue;
  authenticationService.updateCurrentSession({ ...currentSession, ...newSession });
};

const organizationsRequestCallback = (organizations, current_organization_id) => {
  updateCurrentSession({
    organizations,
    load_app: true,
  });

  // if user is trying to load the workspace login page, then redirect to the dashboard
  if (isThisWorkspaceLoginPage())
    return (window.location = appendWorkspaceId(current_organization_id, '/:workspaceId'));
};

export const authorizeUserAndHandleErrors = (workspace_name, organizations) => {
  const subpath = getSubpath();
  authenticationService
    .authorize(workspace_name)
    .then((data) => {
      const { current_organization_id } = data;
      /* add the user details like permission and user previlliage details to the subject */
      updateCurrentSession({
        ...data,
        current_organization_name: workspace_name,
      });
      if (organizations) {
        organizationsRequestCallback(organizations, current_organization_id);
      } else {
        fetchOrganizations(current_organization_id,({ organizations }) => {
          organizationsRequestCallback(organizations, current_organization_id);
        });
      }
    })
    .catch((error) => {
      // if the auth token didn't contain workspace-id, try switch workspace fn
      if (error && error?.data?.statusCode === 401) {
        //get current session workspace id
        authenticationService
          .validateSession()
          .then(({ current_organization_id }) => {
            // change invalid or not authorized org id to previous one
            updateCurrentSession({
              current_organization_id,
            });

            organizationService
              .switchOrganization(workspace_name)
              .then((data) => {
                updateCurrentSession(data);
                if (isThisWorkspaceLoginPage())
                  return (window.location = appendWorkspaceId(workspace_name, '/:workspaceId'));
                authorizeUserAndHandleErrors(workspace_name);
              })
              .catch(() => {
                organizationService.getOrganizations().then((response) => {
                  const current_organization_name = response.organizations.find(
                    (org) => org.id === current_organization_id
                  )?.name;

                  updateCurrentSession({
                    current_organization_name,
                    load_app: true,
                  });

                  if (!isThisWorkspaceLoginPage())
                    return (window.location = `${subpath ?? ''}/login/${workspace_name}`);
                });
              });
          })
          .catch(() => authenticationService.logout());
      } else if ((error && error?.data?.statusCode == 422) || error?.data?.statusCode == 404) {
        window.location = subpath ? `${subpath}${'/switch-workspace'}` : '/switch-workspace';
      } else {
        if (!isThisWorkspaceLoginPage() && !isThisWorkspaceLoginPage(true))
          updateCurrentSession({
            authentication_status: false,
          });
      }
    });
};