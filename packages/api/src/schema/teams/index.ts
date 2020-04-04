// Libraries
import { Teams, Members } from '@beast/beast-entities';

// Types
import { IThrowError } from '@root/utils/throwError/errors';
import { ITeamsResolverMap } from './types';

// Utils
import { validateNewEntity } from '@root/utils';

const resolvers: ITeamsResolverMap = {
  Team: {
    async members(parent, _, { loaders }): Promise<Members[]> {
      const members = await loaders.Members.manyLoaderByIds.loadMany(
        parent.membersIds.map(id => String(id)),
      );
      // TODO: FIX - NOT MAPPING CORRECTLY
      const teamMembers: Members[] = members.reduce((acc: Members[], val) => acc.concat(val as Members[]), []);
      return teamMembers;
    },
  },
  Query: {
    async team(_, { input }, { database }): Promise<Teams | undefined> {
      const team = await database.connection.getRepository(Teams).findOne({
        where: { id: +input.id },
      });
      return team;
    },
    async teams(_, __, { database }): Promise<Teams[]> {
      const teams = await database.connection.getRepository(Teams).find();
      return teams;
    },
  },
  Mutation: {
    async newTeam(
      _,
      { input },
      { database, loaders },
    ): Promise<Teams | IThrowError> {
      const member = database.connection.getRepository(Members).create({
        id: +input.createdBy,
      });
      const team = database.connection.getRepository(Teams).create();
      team.members = [member];
      await validateNewEntity(team);
      await team.save();
      // Clearing the batch cache of the user.
      loaders.Members.manyLoaderByIds.clear(input.createdBy);
      return team;
    },
    async updateTeam(
      _,
      { input },
      { database, loaders },
    ): Promise<Teams | IThrowError> {
      const member = database.connection.getRepository(Members).create({
        id: +input.newMember,
      });
      const team = await database.connection.getRepository(Teams).findOne({
        where: { id: +input.id },
        relations: ['members'],
      });
      team!.members.push(member);
      await database.connection.getRepository(Teams).save(team!);
      // Clearing the batch cache of the user.
      loaders.Members.manyLoaderByIds.clear(input.newMember);
      return team!;
    },
  },
}

export default resolvers;
