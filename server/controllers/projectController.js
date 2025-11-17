
import prisma from "../configs/prisma.js";


// cretae project 


export const createProject = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority} = req.body;

        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user: true}}}
        })
        if(!workspace){
            return res.status(404).json({message: "workspace not found"});
        }
        if(!workspace.members.some((member)=>member.userId === userId && member.role === 'ADMIN')){
            return res.status(403).json({ message: " you don't have permisssion to create projects in this workspace"});
        }
        // get team lead using email
        const teamLead = await prisma.user.findUnique({
            where: {email: team_lead},
            select: {id: true}
        })
        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead?.id,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        // add memeners to prohect if there in worlspace

        if(team_members?.length > 0){
            const membersToAdd = []
            workspace.members.forEach(member => {
                if(team_members.include(member.user.email)){
                    membersToAdd.push(member.user.id)
                }
            })
            await prisma.projectMember.createMany({
                data: membersToAdd.map(memberId => ({
                    projectId: project.id,
                    userId: memberId
                })) 
            })
        }

        const projectWithMembers = await prisma.project.findUnique({
            where: {id: project.id},
            include: {
                members: {include: {user: true}},
                tasks: {include: {assignee: true, comments: {include: {user: true}}}},
                owner: true
            }
        })
        res.json({project: projectWithMembers, message: "Project Cretaed Successfully"})

    } catch (error){
        console.log(error);
        res.status(500).json({ message: error.code || error.message})
    }
}

// updater project

export const UpdateProject = async (req, res) => {
    try {
        const { userId} = await req.auth();
        const {id, workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority} = req.body;

        // check user has  admin role for workspaces

        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if(!workspace){
            return res.status(404).json({ message: "Workspace not found"});
        }
        if(!workspace.members.some((member)=>member.userId === userId && member.role === "ADMIN")){
            const project = await prisma.project.findUnique({
                where: {id}
            })
            if(!project){
                return res.status(404).json({ message : "Project not found"});
            }else if(project.team_lead !== userId){
                return res.status(403).json({ message: " You don't have permisssion  to update projects in the  workspaces"});
            }
        }
        const project  = await prisma.project.update({
            where : {id},
            data: {
                workspaceId,
                description,
                name,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })
        res.json({project, message: "Project Updated Successfully"})
    } catch (error){
        console.log(error);
        res.status(500).json({ message: error.code || error.message})
    }
}

// add mmeber

export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId } = req.params;
        const { email } = req.body;
        // check if the user project lead

        const project  = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })
        if(!project){
            return res.status(404).json ({message: "Project not found"});
        }
        if(project.team_lead !== userId){
            return res.status(404).json ({ message: "User is already a member"});
        }
        const user = await prisma.user.findUnique({where: {email}});
        if(!user){
            return res.status(404).json({ message: "User not found"});
        }
        const member  = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId
            }
        })
        res.json({member, message: "Member added successfully"})

    } catch (error){
        console.log(error);
        res.status(500).json({ message: error.code || error.message})
    }
}