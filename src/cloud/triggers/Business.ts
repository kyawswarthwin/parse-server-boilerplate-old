import { BeforeSaveTrigger, requireLogin, AfterSaveTrigger } from './triggers';

export class Business implements BeforeSaveTrigger, AfterSaveTrigger {
  beforeSave(req: Parse.Cloud.BeforeSaveRequest): void {
    requireLogin(req);

    const { user, object } = req;
    if (object.existed()) {
      return;
    }

    const relation = object.relation('users');
    relation.add(user);
  }

  async afterSave(req: Parse.Cloud.BeforeSaveRequest): Promise<void> {
    const { user, object } = req;
    if (object.existed()) {
      return;
    }

    const roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true);

    const adminRole = new Parse.Role(`${object.id}_admin`, roleACL);
    adminRole.getUsers().add(user);
    await adminRole.save();

    const operatorRole = new Parse.Role(`${object.id}_operator`, roleACL);
    operatorRole.getRoles().add(adminRole);
    await operatorRole.save();

    const businessACL = new Parse.ACL();
    businessACL.setPublicReadAccess(true);
    businessACL.setRoleWriteAccess(adminRole, true);
    object.setACL(businessACL);
    await object.save(
      {},
      {
        useMasterKey: true,
      },
    );
  }
}
