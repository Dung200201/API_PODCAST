import { getAllPackagesTrash } from './getAllTrash';
import { duplicatePackage } from './duplicate';
import { restorePackage } from './restore';
import { createPackage } from './add';
import { getAllPackages } from './getAll';
import { updatePackage } from './update';
import { getPackagesDetailById, getPackagesDetailBySlug } from './get';
import { deletePackage,softDeletePackage } from './delete';

export { createPackage, updatePackage, getAllPackages,duplicatePackage, getPackagesDetailById,restorePackage,getAllPackagesTrash, softDeletePackage, deletePackage, getPackagesDetailBySlug}